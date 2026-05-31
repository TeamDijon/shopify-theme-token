# Theme root

The contract identifying an element as a theme-owned CSS scope root. Carried via a `data-modifiers` value; consumed by substrate CSS for appearance defaults, layout presets, and rhythm scoping.

A theme-root is the top of the theme's CSS scope chain on a given Shopify section. It hosts the section's appearance (typography, color, transitions), runs as a custom element extending `BaseComponent` (events / observers / cache / modifiers managers), and — for merchant-composable sections — provides a parametrizable implicit container for direct `.shopify-block` children.

## Identity

Every theme-root element carries `theme-root` as one of its `data-modifiers` values, alongside other modifiers the element emits:

```liquid
<theme-section data-modifiers="theme-root,layout:column,color-scheme:scheme-1">
<theme-cart data-modifiers="theme-root,color-scheme:scheme-1">
<theme-header data-modifiers="theme-root,color-scheme:scheme-2">
```

The marker is a static identity value, authored directly in each section's Liquid (no value pair; just the bare `theme-root` token). Specialized-section authoring adds it to the custom element's static modifier list.

Generic appearance rules match all theme-roots via `[data-modifiers*='theme-root']`. Specialized-section-specific styling uses tag selectors (`theme-cart { ... }`) when the role matters.

## Five responsibilities

A theme-root carries five responsibilities. They co-locate on the element by design — they're tightly coupled in practice and separating them would impose more cost than it saves.

1. **JS runtime.** Custom-element class extending `BaseComponent`. Hosts the four lifecycle managers for the element's subtree.
2. **Theming context.** Carries `color-scheme:<id>` modifier; per-scheme rules re-emit `--color-role-*` tokens scoped to the modifier-bearing element.
3. **Appearance defaults.** Substrate CSS applies typography, color, background, transitions, form-input styling, heading colors — cascading to descendants.
4. **Layout root.** Owns the section's content cap (`max-inline-size: var(--content-width)`), gutter offset, and layout preset (see Layout enum).
5. **Implicit container for direct block children.** Direct `.shopify-block` children participate in the block-rhythm cascade. Container blocks (`group`, `columns`, `media`) take over composition for their own children.

## Layout enum

Theme-roots that host merchant block composition emit a `layout:<preset>` modifier. The preset bundles direction + theme-default gap + theme-default stack-below into a single setting.

| Preset value | Behavior |
|---|---|
| `column` (default) | `display: flow-root`. Direct block children stack vertically via the block-rhythm cascade. Caps at `--content-width`, gutter offset, centered. |
| `row` | `display: flex; flex-direction: row; flex-wrap: wrap; gap: var(--gutter)`. Children flow horizontally; wrap when content exceeds available width. |
| `columns_2` | `display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--gutter)`. Stacks at container width < 40rem. |
| `columns_3` | Same as `columns_2`, three tracks. Stacks at < 60rem. |
| `columns_4` | Same, four tracks. Stacks at < 60rem. |

Theme defaults are bundled per preset. Merchants picking a layout get those defaults; for finer control (per-section gap, per-section stack-below threshold, color-scheme override on a subset of children), wrap in a `group` or `columns` block.

The `layout` setting on `sections/section.liquid` exposes this enum to merchants. Specialized sections omit the setting and the modifier — they own their layout via per-section CSS (see Layout opt-out).

## Layout opt-out — via modifier omission

A theme-root *without* a `layout:<preset>` modifier gets no layout preset applied. The CSS rules for layout are gated on the layout modifier; no match means no rule fires.

Specialized sections (`<theme-cart>`, `<theme-header>`, `<theme-footer>`) omit `layout:` from their data-modifiers and own their layout via per-section CSS:

```liquid
<theme-cart data-modifiers="theme-root,color-scheme:scheme-1">
  ...
</theme-cart>
```

Appearance defaults still apply (the appearance rule matches `[data-modifiers*='theme-root']` regardless of layout modifier). The specialized section's own CSS sets `display`, `max-inline-size`, padding, and any custom region structure.

Omission is the opt-out mechanism — no separate `no-layout` flag exists.

## Leaf-vs-wrapped composition equivalence

A section composed as `[title, richtext, button]` directly under a theme-root with `layout:column` is equivalent in vertical rhythm to a section composed as `[group{direction:column}, [title, richtext, button]]` inside the same theme-root.

| Composition | Block-spacing source |
|---|---|
| Leaf-only under theme-root (`layout:column`) | Rhythm cascade (`--block-rhythm-*` set on the theme-root) applied to direct children via `[data-modifiers*='theme-root'] > .shopify-block:not(:first-child) { margin-block-start: ... }` |
| Wrapped in a `group` block (`direction:column`) | The group's own `gap` setting (no rhythm cascade leaks in — see Rhythm scope below) |

Choose between them by what's needed:

- **Leaf-only** when the section's primary composition matches the layout preset (column / row / columns_N). No wrapping needed; the merchant picks the layout setting and adds blocks. Saves one nesting level.
- **Wrapped** when the section needs nested composition (a row of columns where each column has its own children), per-wrapper customization (specific gap, color-scheme override on a subset), or container-style variants (card / outlined / elevated treatments on a sub-region).

The two compositions are first-class. Neither is the preferred path.

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

## Specialized-section pattern

A specialized section uses its own custom element extending `BaseComponent` and carries the `theme-root` modifier:

```liquid
<theme-cart data-modifiers="theme-root,color-scheme:{{ section.settings.color_scheme }}">
  {% comment %} custom markup; section owns layout {% endcomment %}
</theme-cart>
```

The specialized section's per-section CSS sets layout independently — `display`, `max-inline-size`, multi-region grid layouts, sticky behavior, etc. Appearance defaults apply via the shared `[data-modifiers*='theme-root']` selector; no enumeration of custom-element tag names required.

When the specialized section needs per-element-type styling beyond the shared defaults, tag selectors are unambiguous and cheap:

```css
theme-cart {
  /* cart-specific layout: multi-region grid */
  display: grid;
  grid-template-areas: "header" "lines" "summary";
  /* ... */
}

theme-header {
  /* header-specific layout: sticky bar */
  position: sticky;
  inset-block-start: 0;
  /* ... */
}
```

## Substrate CSS shape

The substrate's `layer-theme.css` carries the appearance, layout-preset, and rhythm-scope rules. Indicative shape:

```css
@layer theme {
  /* Appearance — every theme-root */
  [data-modifiers*='theme-root'] {
    background: var(--gradient-background);
    color: var(--color-role-foreground);
    font-family: var(--base-font-family);
    /* ...typography, transitions, form-input defaults, heading colors */
  }

  /* Layout: column (default merchant section) */
  [data-modifiers*='theme-root'][data-modifiers*='layout:column'] {
    display: flow-root;
    max-inline-size: var(--content-width, 125rem);
    margin-inline: auto;
    padding-inline: var(--gutter);
  }

  /* Layout: row */
  [data-modifiers*='theme-root'][data-modifiers*='layout:row'] {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--gutter);
    max-inline-size: var(--content-width, 125rem);
    margin-inline: auto;
    padding-inline: var(--gutter);
  }

  /* Layout: columns_2 / columns_3 / columns_4 */
  [data-modifiers*='theme-root'][data-modifiers*='layout:columns_2'] {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--gutter);
    max-inline-size: var(--content-width, 125rem);
    margin-inline: auto;
    padding-inline: var(--gutter);
  }
  /* ...columns_3, columns_4 similarly */

  /* Rhythm cascade — direct children of any theme-root */
  [data-modifiers*='theme-root'] > .shopify-block:not(:first-child) {
    margin-block-start: var(--mobile-margin-block-start, var(--block-rhythm-mobile, 0rem));

    @media (width >= 48rem) {
      margin-block-start: var(--desktop-margin-block-start, var(--block-rhythm-desktop, 0rem));
    }
  }
}
```

Specialized sections that omit the layout modifier get appearance + rhythm but no layout preset; per-section CSS sets layout.

## Related

- Container patterns (gutter / gap / inner padding, bleed model, responsiveness shapes): `.context/docs/container-patterns.md`
- Subgrid migration (planned future state: body-level appearance, named-line bleed grid, strict container-only bleed): `.context/docs/subgrid-migration.md`
- Section convention (`<section>` outer wrapper vs theme-root inner element, file structure): `.context/rules/section-convention.md`
- Specialized section pattern (custom-element + JS class authoring): `.context/docs/specialized-section-pattern.md`
- Modifier system (the `data-modifiers` convention, runtime mutation): `.context/docs/modifier-system.md`
- Composition strategy (L0–L2 + Beyond-L2 layer model): `.context/docs/composition-strategy.md`
- Schema conventions (the `layout` setting under section base settings): `.context/docs/schema-conventions.md`
