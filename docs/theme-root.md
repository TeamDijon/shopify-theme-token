# Theme root

The contract identifying an element as a theme-owned CSS scope root. Carried via a `data-modifiers` value; consumed by substrate CSS for the named-line bleed grid and the block-rhythm cascade.

A theme-root is the top of the theme's CSS scope chain on a given Shopify section. It runs as a custom element extending `BaseComponent` (events / observers / cache / modifiers managers), carries the section's color-scheme context, and — for merchant-composable sections — provides the named-line bleed grid that direct `.shopify-block` children position against.

## Identity

Every theme-root element carries `theme-root` as one of its `data-modifiers` values, alongside other modifiers the element emits:

```liquid
<token-section data-modifiers="theme-root,color-scheme:scheme-1">
<token-cart data-modifiers="theme-root,color-scheme:scheme-1">
<token-header data-modifiers="theme-root,color-scheme:scheme-2">
```

The marker is a static identity value, authored directly in each section's Liquid (no value pair; just the bare `theme-root` token). Specialized-section authoring adds it to the custom element's static modifier list.

Substrate selectors match all theme-roots via `[data-modifiers*='theme-root']` — the layout grid, the bleed-direction rules, and the rhythm cascade all key off this substring. Specialized-section-specific styling uses tag selectors (`token-cart { ... }`) when the role matters.

**Substring-match safety.** `theme-root` must remain a unique substring across every `data-modifiers` value the theme emits. Modifier values like `layout:theme-root-style` would false-match the `[data-modifiers*='theme-root']` selector and apply substrate rules where they don't belong. The convention is to keep `theme-root` as a reserved bare token; never use it as a substring inside another modifier value.

**Agnostic component extraction.** Component CSS reads scheme tokens (`var(--color-role-*)`), typography tokens, and other cascading variables — never the `[data-modifiers*='theme-root']` selector directly. Appearance defaults live on `<body>` (see `subgrid-migration.md` § Body-level appearance), so the theme-root scoping is invisible to components. To lift a component into another theme: copy the snippet + stylesheet, ensure the destination applies the same variable set on `<body>` or up the cascade, no further changes required.

## Four responsibilities

A theme-root carries four responsibilities. They co-locate on the element by design — they're tightly coupled in practice and separating them would impose more cost than it saves.

1. **JS runtime.** Custom-element class extending `BaseComponent`. Hosts the four lifecycle managers for the element's subtree.
2. **Theming context.** Carries `color-scheme:<id>` modifier; per-scheme rules re-emit `--color-role-*` tokens scoped to the modifier-bearing element.
3. **Layout root — bleed grid.** Theme-root resolves as a CSS grid with three tracks and four named lines (`bleed-start` / `content-start` / `content-end` / `bleed-end`). Direct children declare span via `grid-column`, gated on `bleed-desktop:<value>` / `bleed-mobile:<value>` modifiers. See § Bleed grid.
4. **Implicit container for direct block children.** Direct `.shopify-block` children participate in the block-rhythm cascade. Container blocks (`group`, `columns`, `media`) take over composition for their own children (their own gap governs nested spacing — the cascade doesn't leak through).

**Appearance defaults are not a theme-root responsibility.** Typography, color, background, transitions, and form-input styling live on `<body>` in `layer-theme.css`. They cascade to every element inside `<body>` — chrome (header / footer), theme-roots, app sections alike. Apps with their own explicit styling override per normal cascade. See `subgrid-migration.md` § Body-level appearance.

## Bleed grid

Theme-root resolves as a CSS grid with three tracks and named lines:

```css
[data-modifiers*='theme-root'] {
  display: grid;
  grid-template-columns:
    [bleed-start] 1fr
    [content-start] min(var(--content-width, 125rem), calc(100% - 2 * var(--gutter)))
    [content-end] 1fr
    [bleed-end];
}
```

Side tracks shrink from `--gutter` at narrow viewports toward `0` as the viewport grows past convergence (`--content-width + 2 * --gutter`). The center track caps at `--content-width` and is clamped to `100% - 2 * --gutter` at narrow viewports. The convergence math means bleed and content both cap at `--content-width` at viewports ≥ `--content-width + 2 * --gutter`; below convergence, bleeding children extend to viewport edges. Edge-to-edge backgrounds at very wide viewports live on the outer `.shopify-section` (no max-inline-size).

Direct children default to the content track:

```css
[data-modifiers*='theme-root'] > * {
  grid-column: content-start / content-end;
}
```

Container blocks (`group`, `columns`, `media`) opt into wider spans via the responsive bleed modifier API:

| Desktop modifier | Mobile modifier | grid-column at viewport |
|---|---|---|
| (none) | (none) | `content-start / content-end` (default) |
| `bleed-desktop:both` | (none) | desktop: `bleed-start / bleed-end`; mobile: default |
| `bleed-desktop:inline-start` | (none) | desktop: `bleed-start / content-end`; mobile: default |
| `bleed-desktop:inline-end` | (none) | desktop: `content-start / bleed-end`; mobile: default |
| (any) | `bleed-mobile:both` | mobile: `bleed-start / bleed-end` overrides desktop rules at < 48rem |

Mobile is a binary `both`-only enum — single-column mobile has no edge tracks, so per-side bleed has no geometric meaning.

**Strict container-only.** Only container blocks declare bleed direction. Content blocks (`title`, `richtext`, `button`, `spacer`, `separator`, `embed`) carry no bleed setting. Children of containers position via the container's own layout — they don't independently reach section's bleed lines. See `subgrid-migration.md` § Bleed model.

## Specialized-section opt-out

A specialized section (`<token-cart>`, `<token-header>`, `<token-footer>`) carries `theme-root` for identity, color-scheme tokens, and JS runtime — but owns its layout independently. Per-section CSS overrides `display: grid` with whatever layout the section needs:

```css
token-cart {
  display: grid;
  grid-template-areas: "header" "lines" "summary";
  /* ... */
}

token-header {
  display: flex;
  position: sticky;
  inset-block-start: 0;
  /* ... */
}
```

Specialized sections that need to retain the bleed grid pass through; those that don't override `display` and resolve as the override. No separate opt-out modifier is required — per-section CSS wins by cascade.

## Leaf-vs-wrapped composition

A section composed as `[title, richtext, button]` directly under `<token-section>` is equivalent in vertical rhythm to `[group{direction:column}, [title, richtext, button]]`:

| Composition | Block-spacing source |
|---|---|
| Leaf-only under token-section | Rhythm cascade (`--block-rhythm-*` set on the theme-root) applied to direct children via `[data-modifiers*='theme-root'] > .shopify-block:not(:first-child) { margin-block-start: ... }` |
| Wrapped in a `group` block (`direction:column`) | The group's own `gap` setting (no rhythm cascade leaks in — see Rhythm scope below) |

Choose between them by what's needed:

- **Leaf-only** when the section's primary composition is a vertical stack with section-rhythm spacing. Saves one nesting level.
- **Wrapped** when the section needs nested composition (a row of columns where each column has its own children), per-wrapper customization (specific gap, color-scheme override on a subset), or container-style variants (card / outlined / elevated treatments on a sub-region).

Both compositions are first-class. Neither is the preferred path.

For non-vertical compositions (row, multi-track), wrap in `group` or `columns`. Section host (`sections/section.liquid`) no longer exposes a `layout` setting — the always-bleed-grid model means row / columns_N would need container blocks to layout their own children, so the section-level enum was redundant. See `subgrid-migration.md` § Open questions (resolved: dropped).

## Rhythm scope

The block-rhythm cascade applies to direct children of a theme-root, not to all blocks anywhere:

```css
[data-modifiers*='theme-root'] > .shopify-block:not(:first-child) {
  margin-block-start: var(--mobile-margin-block-start, var(--block-rhythm-mobile, 0rem));

  @media (width >= 48rem) {
    margin-block-start: var(--desktop-margin-block-start, var(--block-rhythm-desktop, 0rem));
  }
}
```

Inside container blocks (`group`, `columns`, `media`), the parent's `gap` setting governs between-child spacing. The rhythm cascade doesn't reach those nested blocks — the `> .shopify-block` direct-child selector limits scope to one level deep.

This resolves the "rhythm + gap sum" footgun that exists when a flat selector (`.shopify-block:not(:first-child)`) matches nested blocks: a child of a container block was receiving both the rhythm-cascade margin AND the parent's gap, summed visually.

## Substrate CSS shape

The substrate's `layer-theme.css` carries the bleed grid, bleed-direction rules, rhythm cascade, and container-style variants. Appearance lives on `<body>` (separately). Indicative shape:

```css
@layer theme {
  /* Theme-root: bleed grid */
  [data-modifiers*='theme-root'] {
    display: grid;
    grid-template-columns:
      [bleed-start]
      min(var(--gutter), max(0px, calc((var(--content-width, 125rem) + 2 * var(--gutter) - 100%) / 2)))
      [content-start]
      min(var(--content-width, 125rem), calc(100% - 2 * var(--gutter)))
      [content-end]
      min(var(--gutter), max(0px, calc((var(--content-width, 125rem) + 2 * var(--gutter) - 100%) / 2)))
      [bleed-end];
    justify-content: center;
    position: relative;
  }

  /* Default: direct children sit in the content track */
  [data-modifiers*='theme-root'] > * {
    grid-column: content-start / content-end;
  }

  /* Desktop bleed (≥ 48rem) */
  @media (width >= 48rem) {
    [data-modifiers*='theme-root'] > [data-modifiers*='bleed-desktop:both'] {
      grid-column: bleed-start / bleed-end;
    }
    /* ...inline-start, inline-end */
  }

  /* Mobile bleed (< 48rem) */
  @media (width < 48rem) {
    [data-modifiers*='theme-root'] > [data-modifiers*='bleed-mobile:both'] {
      grid-column: bleed-start / bleed-end;
    }
  }

  /* Rhythm cascade — direct children of any theme-root */
  [data-modifiers*='theme-root'] > .shopify-block:not(:first-child) {
    margin-block-start: var(--mobile-margin-block-start, var(--block-rhythm-mobile, 0rem));

    @media (width >= 48rem) {
      margin-block-start: var(--desktop-margin-block-start, var(--block-rhythm-desktop, 0rem));
    }
  }
}
```

## Related

- Subgrid migration (the structural overhaul that produced this contract; explains the body-level appearance shift + named-line grid + strict container-only bleed): `.context/docs/subgrid-migration.md`
- Container patterns (gutter / gap / inner padding, bleed model under the named-line grid, content cap): `.context/docs/container-patterns.md`
- Section convention (`<section>` outer wrapper vs theme-root inner element, file structure): `.context/rules/section-convention.md`
- Specialized section pattern (custom-element + JS class authoring): `.context/docs/specialized-section-pattern.md`
- Modifier system (the `data-modifiers` convention, runtime mutation): `.context/docs/modifier-system.md`
- Composition strategy (L0–L2 + Beyond-L2 layer model): `.context/docs/composition-strategy.md`
- Schema conventions (section base settings — content_width, block_rhythm, color_scheme): `.context/docs/schema-conventions.md`
