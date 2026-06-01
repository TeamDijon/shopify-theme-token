# CSS standards

Conventions for theme CSS.

## Specificity discipline

- **Cap at `0 4 0`.** Higher specificity signals excessive nesting or DOM depth — restructure instead.
- **No `!important`.**
- **No ID selectors except for `utility--dynamic-style`'s scoping.** That snippet emits `#<base_selector> { ... }` to scope per-instance values; everywhere else, use class or attribute selectors.
- **`:where()` to keep grouped selectors low-specificity.** Examples in `layer-reset.css`: `:where(*, ::before, ::after) { box-sizing: border-box }`, `:where(input, textarea, select) { ... }`.

## `:has()` performance

- **Anchor close to the descendant.** `token-section:has([data-modifiers*="x"])` matches earlier in the selector engine than `:has(token-section [data-modifiers*="x"])`.
- **Prefer `>` combinator.** `token-section:has(> [data-active])` is cheaper than `token-section:has([data-active])` when the subtree is large.
- **Avoid `:has()` on subtrees that mutate frequently.** Each mutation re-evaluates the selector for every potential match.

## Native nesting

Modern CSS nesting is used throughout — `& > *`, `&[data-modifiers*="x"]`, `& :where(...)`. Required: a parent selector before nested rules; nested rules start with a combinator (` `, `>`, `+`, `~`) or `&`.

## Layers

`assets/layer-base.css` declares `@layer reset, theme, components, utilities;`. Cascade priority runs left → right (later layers win). Place rules deliberately:

- `@layer reset` — universal hygiene applied to everything (UA-default normalizations, media defaults).
- `@layer theme` — **body-level appearance defaults** (typography, color, background, transitions, form inputs) cascade from `<body>` to every element inside it (chrome + theme-roots + app sections alike). Theme-roots matched via `[data-modifiers*='theme-root']` resolve as the named-line bleed grid + rhythm cascade. Every theme-owned custom-element root (`token-section`, future `token-cart` / `token-header` / `token-footer`) carries `theme-root` in `data-modifiers`. Specialized sections override `display` per-section to opt out of the bleed grid. See `.context/docs/theme-root.md` for the contract and `.context/docs/subgrid-migration.md` for the body-level appearance rationale.
- `@layer components` — per-block and per-section stylesheets. Wrap every `{% stylesheet %}` block and `assets/<name>.css` body in `@layer components { ... }`. This puts component styles **above** theme defaults (so blocks override theme appearance) but **below** utilities (so opt-in modifiers like `prose:narrow` cleanly override component defaults without each block needing a `:not()` escape hatch).
- `@layer utilities` — opt-in modifiers (`prose`, `prose:narrow`, `skip-to-content`). Last in the ladder, so they always win when applied.

The four-layer model means: utilities > components > theme > reset. A block's stylesheet can override theme typography or color, and a merchant-toggled utility (e.g. narrow prose) can in turn override the block's max-width — all without `!important` or specificity gymnastics.

Anything still emitted **outside layers** (e.g. inline declarations from `utility--dynamic-style`, which scopes per-instance values to `#<base_selector>`) lives at the highest precedence — above utilities. That's intentional for per-instance Liquid-computed values, which always need to win over both component CSS and utility modifiers.

## Variables and tokens

- **CSS custom properties for repeated values** — colors, spacing, typography, animation timings.
- **Color tokens come from `theme_color` metaobjects** via `utility--css-variables`. Don't hardcode colors in component CSS; use `var(--color-<token>)`.
- **Spacing/typography tokens come from theme settings + `text_style`/`content_width` metaobjects.** Same rule: use the variable, not the literal.
- **Component-local custom properties** are fine — declare on the component's root selector; reference via `var(--name, fallback)`.
- **Full-word names, no shorthand suffixes** — `--button-background` not `--button-bg`, `--icon-foreground` not `--icon-fg`. Agent-first authoring; shorthand suffixes force context-loading where full words don't. Exempt: established CSS conventions universally readable across the ecosystem — size tokens (`-sm` / `-md` / `-lg` / `-xs` / `-xl`), color-format suffixes (`-rgb` / `-hsl` / `-oklch`), logical-property dimensions (`-inline` / `-block`).

## Design constants

`layer-base.css` declares scheme-independent invariants in a top-level `:root`. Consume these rather than hardcoding:

- **Z-index** — `--layer-below` (−1), `--layer-base` (0), `--layer-raised` (100), `--layer-sticky` (200), `--layer-overlay` (300), `--layer-drawer` (400), `--layer-temporary` (500). Gaps of 100 leave room for intermediate layers; third-party overlays sit above the scale.
- **Motion** — `--duration-fast` (120ms), `--duration-base` (200ms), `--duration-slow` (320ms); `--ease-standard`, `--ease-emphasized`, `--ease-out`.
- **Focus ring** — `--focus-ring-width`, `--focus-ring-offset` (color is scheme-driven via `--color-role-focus-ring`).

Scheme-dependent tokens (colors, opacity, shadow) are emitted per-scheme by `utility--css-variables`; these constants are not.

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

Component CSS targets a unique root selector, picked by the primitive's consumption mode (see `.context/docs/composition-strategy.md` — block-backed vs sub-component):

- **Block-backed primitive** — the snippet *is* a theme-block root (schema `"tag": null`), so it renders the root itself and emits `class="shopify-block shopify-block--<name>"` + `{{ block.shopify_attributes }}`. Style via `.shopify-block--<name>`. (`title`, `button`, `media`, …)
- **Sub-component primitive** — nested inside other blocks/sections, never a block root. Style via a clean `.<name>` (`.star-rating`, `.badge`, `.skip-to-content`).
- **Specialized section** — the custom element tag (`token-cart`, `token-header`).

Avoid bare element selectors that could leak (`button { ... }` in a block stylesheet styles every `<button>` on the page once the block is rendered, not just the block's own).

## Inner element naming

Style descendants of the component root with short, semantic class names — no BEM `__element` suffixes. `.card-link`, `.media-container`, `.rating-count`, not `.product-card__card-link`. The root scopes them.

```css
.star-rating {
  & > svg { /* terminal structural children */ }
  & .rating-count { /* named slots */ }
  &:hover { /* state */ }
  &[data-modifiers*='size:large'] { /* variants via modifier system */ }
}
```

This is rscss-adjacent (Reasonable System for CSS Stylesheet Structure) + the modifier system in place of BEM `--modifier` chains. See `.context/docs/modifier-system.md` for the modifier authoring contract.

Use tag selectors (`& > svg`, `& > img`) for terminal structural slots unlikely to grow a wrapper. Use class selectors when the slot may gain a wrapper, or when multiple instances of the tag are present.

Existing components mix patterns — some early code uses `.shopify-block--<name>__element` BEM-style (`.shopify-block--columns__inner`, `.shopify-block--embed__diagnostic`). New components follow the inner-naming rule above; existing holdouts migrate opportunistically when touched.

## Cross-component overrides

When a consuming component needs to tweak a nested component's appearance:

1. **CSS custom properties** the inner component exposes (`--icon-size`, `--rating-color`) — set on the consumer's root, inherited down. No specificity battle.
2. **One level of consumer-root descendant** — `.product-card .star-rating { ... }`. Works when the inner component didn't expose the right hook.

Avoid stacking more than one consumer scope (`.featured-product .product-card .star-rating > svg`) — past two levels, specificity becomes brittle. Reach for custom properties.

## Container queries

For block-level layout adaptation (a child responding to its container's actual width rather than the viewport), use `@container` queries. Most relevant for the `group` / `columns` / `media` blocks where a child's available width is a function of how the merchant composed the layout, not a global breakpoint.

```css
/* The element that DEFINES the container only declares it. */
.shopify-block--columns {
  container-type: inline-size;
  container-name: columns;
}

/* Queries target a DESCENDANT — the element with `container-type` is
   not itself matched by `@container <name>` (per CSS Containment spec). */
.shopify-block--columns__inner {
  display: grid;
}

@container columns (inline-size >= 40rem) {
  .shopify-block--columns__inner {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

Prefer container queries over media queries whenever the relevant width is the parent's, not the viewport's.

**Established consumers**: `group` and `columns` split into an outer/inner pair — the outer (`.shopify-block--<name>`) declares `container-type: inline-size; container-name: <block>`, the inner (`.shopify-block--<name>__inner`) carries the flex/grid layout and is the target of every `@container` rule. Stack-below tokens (`stack-below:40|60|80`) on the outer's `data-modifiers` switch the inner between row/grid and column layout.

**Caveats**:
- **Don't query the host element.** `@container <name>` only matches descendants of the named container, never the element with `container-type` itself. A rule like `.foo[data-modifiers*='stack-below'] { ... }` placed inside `@container foo (...)` on the same `.foo` element silently never fires. Always target a descendant.
- **Ancestor must establish a containing block.** A `display: contents` parent removes the size context, so `inline-size >= 40rem` never matches. If a child block looks "stuck" in its small-container fallback, audit the parent chain.

**Container-query units**: inside a named container, `cqi` (inline-size), `cqb`, `cqw`, `cqh` size relative to the container, not the viewport — preferable to viewport `clamp()` for content composed into `group`/`columns`. Pattern: `clamp(<min>, <value>cqi, <max>)` for fluid-but-bounded sizing such as card/slide widths. Supported in all current engines.

## `@property` for animatable custom properties

Untyped CSS custom properties don't animate — `transition: --my-color 0.3s` is a no-op because CSS treats the value as a string. Declare the property with `@property` to enable smooth animation and type safety:

```css
@property --my-color {
  syntax: "<color>";
  inherits: true;
  initial-value: transparent;
}
```

Use whenever a custom property needs to animate (color-scheme transitions, computed gutter changes, etc.). Supported in Safari 16.4+, Firefox 128+.

Token declares no `@property` rules yet — nothing transitions a custom property directly (the scheme crossfade animates real `background-color`/`color`, which only read the changed token). Type a token when a component first transitions it.

## Unit choice in custom-property defaults

Three regimes cover the unit choice for component-CSS custom-property defaults:

| Regime | Unit | When |
|---|---|---|
| **Typographic — scales with the immediate type context** | `em` | The value should track whatever `font-size` cascaded into the component. Marks, decorative glyphs, cite text, padding-around-typography, inner-paragraph rhythm. Em resolves against the parent's `font-size` — CSS inheritance does the work, no per-consumer override needed. |
| **Structural — feels theme-wide consistent regardless of context** | `rem` | The value should look the same whether the component lives in a 1rem body or a 1.5rem pull-quote context. Rail-mode padding, container gaps, layout margins, structural spacing that isn't proportional to content. Rem resolves against `:root`. |
| **Device-pixel — invariant to typography** | `px` | Border widths, hairline rules. The substrate constant `--border-default: 2px` is the canonical case; component borders use `var(--border-default)` or compose with `px` directly. |

### Example — a quote primitive in two contexts

A `quote` snippet renders inside an L1 wrapper (`pull-quote` at `font-size: 1.5rem`) or in body richtext (1rem inherited from body). With em-based defaults for typographic surfaces:

```css
.quote {
  font-size: 1em;                     /* inherits cascaded font-size */
  padding-inline-start: 1rem;         /* rail gap — theme-wide structural */
  border-inline-start: 2px solid …;   /* hairline — device-relative */

  &[data-modifiers~="marks:visible"] {
    padding-inline-start: 2.5em;      /* scales with mark size — typographic */

    &::before {
      font-size: 3em;                 /* mark scales with quote text */
    }
  }
}
```

In pull-quote: `font-size: 1em` resolves to 1.5rem (inherited), `3em` mark resolves to 4.5rem, `2.5em` padding to 3.75rem. In body context: same em values resolve to 1rem / 3rem / 2.5rem. Internal ratios stay invariant; absolute values track the inherited typography. The 1rem rail gap and 2px border stay constant across both contexts.

### Why this matters

A primitive designed without this regime forces consumers to override per-context (`pull-quote.md` setting `--quote-mark-size: 4.5rem` to maintain the visual ratio against its 1.5rem text). The em pattern moves the work into the primitive — consumers wrap with their chosen `text_style` and let CSS inheritance flow.

The substrate's responsibility: name the typographic context once at the wrapping element (via `text_style` modifiers or direct `font-size`). The primitive's responsibility: use em internally so its inner proportions follow.

## Per-instance generic variable names + cascade inheritance

Block-level dynamic-style emissions use **generic variable names** scoped per-instance (`--background-color`, `--text-color`, `--text-align`, `--content-width`, `--mobile-margin-block-start`, etc.) rather than component-prefixed names (`--richtext-text-color`). The scoping comes from `utility--dynamic-style`'s `#shopify-block-<id> { ... }` wrapper.

**Cascade inheritance through block nesting is by design.** A `title` block with no `text_color` set, placed inside a `group` block that emits `--text-color: #foo`, inherits the group's value via CSS cascade. The title's component CSS reads `var(--text-color, var(--color-role-foreground-heading))`, so when the group's per-instance scope sets `--text-color`, the title reads the inherited value before falling through to the role-token default.

This is the intended behavior — parent blocks contextualize their descendants' typography / color decisions without requiring the descendants to opt in. A merchant grouping a title + richtext under a single `group` with a foreground-color setting gets the color applied uniformly without per-block configuration.

**Implications:**
- Don't prefix variable names with the block name (`--richtext-text-color`) when the variable's intent is cascade-able. The generic name is the point.
- Per-block component CSS uses `var(--<name>, <block-specific fallback>)` to express "inherit from parent context if set, otherwise this block's default."
- Block-specific variables that should NOT cascade (e.g., `--spacer-block-size` — only meaningful on a spacer) keep the component prefix.

## Focus and motion

- `:focus-visible` outlines use `--focus-ring-width` / `--focus-ring-offset` + `--color-role-focus-ring`; never `outline: none` without a replacement.
- Transitions and animations use the motion tokens (`--duration-*`, `--ease-*`). The reset's `prefers-reduced-motion: reduce` branch neutralizes motion globally.
- `forced-colors: active` maps the focus outline to the system `Highlight` and keeps `forced-color-adjust: auto` on form controls. Don't override system color decisions beyond restoring affordances.
- Light/dark is merchant-driven through color schemes; the `prefers-color-scheme` media query is intentionally absent.

## Related

- `.context/rules/a11y-conventions.md` — color contrast, focus management, prefers-reduced-motion details
- `.context/docs/asset-loading.md` — where component CSS lives (file vs `{% stylesheet %}`)
- `.context/docs/dynamic-style-pattern.md` — per-instance Liquid-computed CSS
