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
2. **Theming context.** Carries `color-scheme:<id>` modifier; per-scheme rules re-emit `--color-role-*` tokens scoped to the modifier-bearing element, and the theme-root paints its own `background` + `color` from those tokens so a section-level scheme override renders a real background band. See § Scheme paint.
3. **Layout root — bleed grid.** Theme-root resolves as a CSS grid with three tracks and four named lines (`bleed-start` / `content-start` / `content-end` / `bleed-end`). Direct children declare span via `grid-column`, gated on `bleed-desktop:<value>` / `bleed-mobile:<value>` modifiers. See § Bleed grid.
4. **Implicit container for direct block children.** Direct `.shopify-block` children participate in the block-rhythm cascade. Container blocks (`group`, `columns`, `media`) take over composition for their own children (their own gap governs nested spacing — the cascade doesn't leak through).

**Base appearance lives on `<body>`; per-section scheme paint lives on the theme-root.** Typography, transitions, and form-input styling live on `<body>` in `layer-theme.css` and cascade to every element inside it — chrome (header / footer), theme-roots, app sections alike. Background + foreground color are the one split: `<body>` paints the *base* scheme (so chrome + app sections inherit it), and each theme-root *re-paints* its own scheme `background` + `color` from its `--color-role-*` tokens, so a section-level `color_scheme` override renders a real background band and re-resolves text color for descendants. See § Scheme paint and `subgrid-migration.md` § Body-level appearance.

## Scheme paint

Each theme-root paints its own scheme background and foreground:

```css
[data-modifiers*='theme-root'] {
  background: var(--gradient-background);
  color: var(--color-role-foreground);
}
```

`background` reads `--gradient-background` (a solid color when the scheme defines no gradient, the gradient otherwise); `color` reads `--color-role-foreground`. Both resolve against the `--color-role-*` tokens emitted on the *same* element by the `color-scheme:<id>` rule — so a section carrying `color-scheme:scheme-3` paints the scheme-3 background and sets scheme-3 foreground, which descendants inherit. Without the `color` declaration here, descendants would inherit `<body>`'s already-resolved foreground (a section override would recolor nothing).

`<body>` still paints the base scheme for chrome + app sections, which carry no theme-root. The theme-root paint is additive: every section paints its own band — the base scheme when unoverridden, the override scheme otherwise. Heading color (`--color-role-foreground-heading`) is applied by the body-level heading rule, which re-resolves per scheme through the same token cascade.

Container blocks (`group` / `columns` / `media`) carry `color-scheme` overrides too, and they **paint their own band** the same way — a region-level scheme paint one level finer than the section (body base → section → region). The rule lives in `layer-theme.css` scoped to the three container classes (`:where(.shopify-block--group, …)[data-modifiers*='color-scheme']`), reusing the same `background: var(--gradient-background); color: var(--color-role-foreground)` pair. The `color` half is load-bearing here too — token re-emission alone wouldn't re-resolve descendants' already-inherited plain text color. It sits *before* the `container-style` variants, so `card` / `elevated` (whose fill is itself scheme-derived) win on source order and `outlined` + a band compose additively. A bare band carries no inner padding (like the theme-root paint); `container-style` adds its own.

Each level's override is opt-in: a `custom_color_scheme` setting (default off) gates whether `color-scheme:<id>` is emitted at all. Off → no modifier → the element rides the ancestor/substrate scheme; on → the picked scheme applies. See `schema-conventions.md` § Color-scheme override for the schema shape.

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
  margin-block-start: var(--mobile-margin-block-start, var(--block-rhythm, 0rem));

  @media (width >= 48rem) {
    margin-block-start: var(--desktop-margin-block-start, var(--block-rhythm, 0rem));
  }
}
```

The section sets `--block-rhythm: var(--spacing-<picked-handle>)` per its `block_rhythm` setting. Responsive resolution (mobile vs desktop value) lives in the spacing token's own `@media` branch in `utility--css-variables`; the `@media` here is for the per-block margin override path.

Inside container blocks (`group`, `columns`, `media`), the parent's `gap` setting governs between-child spacing. The rhythm cascade doesn't reach those nested blocks — the `> .shopify-block` direct-child selector limits scope to one level deep.

This resolves the "rhythm + gap sum" footgun that exists when a flat selector (`.shopify-block:not(:first-child)`) matches nested blocks: a child of a container block was receiving both the rhythm-cascade margin AND the parent's gap, summed visually.

**Spacers are rhythm-neutral.** A `spacer` block is an *explicit* gap, so it replaces the rhythm at its boundary instead of stacking with it: the spacer takes no rhythm margin (its height is the gap), and the block immediately after a spacer takes none either (the spacer already spaced it). A second rule encodes this:

```css
[data-modifiers*='theme-root'] > .shopify-block--spacer,
[data-modifiers*='theme-root'] > .shopify-block--spacer + .shopify-block {
  margin-block-start: 0;
}
```

So `block_rhythm` (the default between-sibling gap) and spacers (explicit gaps) never double up — a spacer yields exactly its token's height at that boundary. Additive spacing is achieved with a larger spacer token, not by stacking rhythm onto it. This is the CSS encoding of the spacer = explicit-gap / rhythm = default-between-sibling split (see `spacer.md`).

## Substrate CSS shape

The substrate's `layer-theme.css` carries the bleed grid, bleed-direction rules, rhythm cascade, per-section scheme paint, and container-style variants. Base appearance (typography, transitions, form inputs) lives on `<body>` separately. Indicative shape:

```css
@layer theme {
  /* Theme-root: bleed grid + per-section scheme paint */
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
    background: var(--gradient-background);
    color: var(--color-role-foreground);
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
    margin-block-start: var(--mobile-margin-block-start, var(--block-rhythm, 0rem));

    @media (width >= 48rem) {
      margin-block-start: var(--desktop-margin-block-start, var(--block-rhythm, 0rem));
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
