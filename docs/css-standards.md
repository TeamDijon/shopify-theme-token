# CSS standards

Conventions for theme CSS. Distilled from Horizon's `css-standards.mdc` and our existing practice. Not exhaustive; deeper patterns reference Horizon (`C:\Users\troph\Downloads\horizon-main\horizon-main\.cursor\rules\css-standards.mdc`).

## Specificity discipline

- **Cap at `0 4 0`** — never need more. If you do, the structure is wrong (excessive nesting, DOM-too-deep).
- **No `!important`.** Specificity exists to be respected; bypassing it leaks fragility.
- **No ID selectors except for `utility--dynamic-style`'s scoping.** That snippet emits `#<base_selector> { ... }` to scope per-instance values; everywhere else, use class or attribute selectors.
- **`:where()` to keep grouped selectors low-specificity.** Examples in `core.css`: `:where(*, ::before, ::after) { box-sizing: border-box }`, `:where(input, textarea, select) { ... }`.

## `:has()` performance

- **Anchor close to the descendant.** `theme-section:has([data-modifiers*="x"])` matches earlier in the selector engine than `:has(theme-section [data-modifiers*="x"])`.
- **Prefer `>` combinator.** `theme-section:has(> [data-active])` is cheaper than `theme-section:has([data-active])` when the subtree is large.
- **Avoid `:has()` on subtrees that mutate frequently.** Each mutation re-evaluates the selector for every potential match.

## Native nesting

Modern CSS nesting is used throughout — `& > *`, `&[data-modifiers*="x"]`, `& :where(...)`. Required: a parent selector before nested rules; nested rules start with a combinator (` `, `>`, `+`, `~`) or `&`.

## Layers

`assets/core.css` declares `@layer reset, theme, utilities;`. Stylesheets default to **no layer** (highest precedence). Place rules deliberately:

- `@layer reset` — universal hygiene applied to everything (UA-default normalizations, media defaults).
- `@layer theme` — theme-managed roots (`:is(theme-section, theme-cart, ...)` typography/background) + `theme-section` layout/form rules.
- `@layer utilities` — opt-in modifiers (prose, skip-to-content). Lowest specificity within the layer ladder, highest layer precedence.

Component CSS in `assets/<name>.css` and `{% stylesheet %}` blocks lives **outside layers** (highest precedence) so component styles override theme defaults.

## Variables and tokens

- **CSS custom properties for repeated values** — colors, spacing, typography, animation timings.
- **Color tokens come from `theme_color` metaobjects** via `utility--css-variables`. Don't hardcode colors in component CSS; use `var(--<token>-color)`.
- **Spacing/typography tokens come from theme settings + `text_style`/`content_width` metaobjects.** Same rule: use the variable, not the literal.
- **Component-local custom properties** are fine — declare on the component's root selector; reference via `var(--name, fallback)`.

## Logical properties

Always prefer logical over physical:

| Use | Not |
|---|---|
| `inline-size`, `block-size` | `width`, `height` |
| `margin-block-start`, `margin-inline-end` | `margin-top`, `margin-right` |
| `padding-block`, `padding-inline` | `padding-top`/`bottom`, `padding-left`/`right` |
| `inset-block-start` | `top` |
| `border-inline-start` | `border-left` |

Logical properties handle RTL/vertical flow correctly without per-locale overrides.

## Component scoping

Component CSS targets a unique root selector — `.shopify-block--<name>` for blocks, the custom element tag for sections (`theme-cart`, `theme-header`). Avoid bare element selectors that could leak (`button { ... }` in a block stylesheet styles every `<button>` on the page once the block is rendered, not just the block's own).

## Container queries

For block-level layout adaptation (a child responding to its container's actual width rather than the viewport), use `@container` queries. Most relevant for the `group` / `columns` / `media` blocks where a child's available width is a function of how the merchant composed the layout, not a global breakpoint.

```css
.shopify-block--media {
  container-type: inline-size;
  container-name: media;

  @container media (inline-size < 24rem) {
    /* compact layout for narrow containers */
  }
}
```

Prefer container queries over media queries whenever the relevant width is the parent's, not the viewport's. Modern engines all support this.

## `@property` for animatable custom properties

Untyped CSS custom properties don't animate — `transition: --my-color 0.3s` is a no-op because CSS treats the value as a string. Declare the property with `@property` to enable smooth animation and type safety:

```css
@property --my-color {
  syntax: "<color>";
  inherits: true;
  initial-value: transparent;
}
```

Use whenever a custom property needs to animate (color-scheme transitions, computed gutter changes, etc.). All modern engines support `@property` (Safari since 16.4, Firefox since 128).

## Focus and motion

- `:focus-visible` for outline rules; never `outline: none` without a replacement.
- `outline-offset` to keep focus indicators clear of the element edge.
- All animations include a `@media (prefers-reduced-motion: reduce)` branch that disables or shortens motion.
- Color rules respect `@media (forced-colors: active)` — don't override system color decisions in high-contrast mode.

## Related

- Horizon `css-standards.mdc` — deeper patterns, anti-patterns, and Shopify-specific concerns
- `.context/rules/a11y-conventions.md` — color contrast, focus management, prefers-reduced-motion details
- `.context/docs/asset-loading.md` — where component CSS lives (file vs `{% stylesheet %}`)
- `.context/docs/dynamic-style-pattern.md` — per-instance Liquid-computed CSS
