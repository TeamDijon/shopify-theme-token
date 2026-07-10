# layer-theme

**Layer**: substrate

**Type**: utility-css (`assets/layer-theme.css`)

**Status**: shipped

**Implementation**: `assets/layer-theme.css` — pinned by description per `spec-convention.md` § Substrate stylesheets. Five rule groups, each anchored by its selector chain:
- `.shopify-section` — outer-wrapper outer-flow rules (anchor scrolling, scroll-behavior)
- `body` — body-level appearance (theme typography + scheme background/foreground + heading color + form-input defaults)
- `[data-modifiers*='theme-root']` — bleed grid (three-track named-line grid; default content-track placement; bleed-desktop / bleed-mobile opt-ins)
- `[data-modifiers*='theme-root'] > .shopify-block:not(:first-child)` — block-rhythm cascade (per-instance margin override → section block-rhythm → `0rem`)
- `:where(.shopify-block--group, .shopify-block--columns, .shopify-block--media)[data-modifiers*='container-style:<handle>']` — container-style variants (3 seeded: `card` / `outlined` / `elevated`)

**Reconciled**: 2026-06-28 (bleed grid — per-side desktop selectors corrected to match the emitted modifier value: `bleed-desktop:inline_start` / `inline_end` underscore, was hyphen; per-side bleed never matched before, fixed for group / columns / media. 2026-06-04 — initial reconcile.)

**Reviewed**: 2026-06-04

**Depends on**:
- `design-constants.spec.md` (`assets/layer-base.css`) — reads `--duration-*`, `--ease-*`, `--radius-default` for transitions + container-style variants
- `utility--css-variables.spec.md` — reads `--color-role-*` (scheme tokens), `--base-*` (text-style aliases), `--gradient-background`, `--gutter`, `--content-width`, `--block-rhythm` (section-emitted)
- `utility--block-layout-vars.spec.md` — reads per-instance `--mobile-margin-block-start` / `--desktop-margin-block-start` for the block-rhythm cascade
- `container-style.spec.md` — handle catalog for the variant rules

**Consumers**:
- Every section's rendered DOM — `.shopify-section` rules apply universally
- `body` — body-level appearance cascades through every element
- Every `<token-section>` / `<theme-<name>>` carrying `theme-root` in `data-modifiers` — bleed grid + block-rhythm cascade
- Every container block (`group`, `columns`, `media`) carrying `container-style:<handle>` — variant CSS

## Purpose

Aggregates five rule groups composing the theme's outer-flow, body-level appearance, layout grid, rhythm cascade, and container-variant catalog into one `@layer theme` block. The grouping is by selector-cohesion: outer-flow at universal scope (applies to apps + chrome), body-level at every-element scope (theme defaults), `theme-root` at opt-in scope (sections opting into the bleed grid). Each layer's blast radius matches its concern.

Where `layer-base.css` carries scheme-independent constants (motion, radius, z-index, spacing defaults), `layer-theme.css` carries the rules those constants and the per-scheme tokens compose into. Per-block / per-component CSS lives in each block's `{% stylesheet %}` block, not here.

## API

N/A — pure CSS, no Liquid params or render interface. Consumers read by class / modifier selectors as defined below.

## Output shape

Five rule groups inside one `@layer theme { ... }` block:

### 1. Outer-section wrapper (universal scope)

```css
.shopify-section {
  scroll-margin-block-start: 5rem;
  scroll-behavior: var(--scroll-behavior);
  --scroll-behavior: smooth;

  @media (prefers-reduced-motion) {
    --scroll-behavior: auto;
  }
}
```

Universal — applies to Token sections AND app sections AND chrome sections. Only outer-flow concerns belong here (anchor scrolling, scroll-behavior). No typography, background, transitions — those would bleed into app sections.

### 2. Body-level appearance (every-element cascade)

```css
body {
  background: var(--gradient-background);
  color: var(--color-role-foreground);

  font-family: var(--base-font-family);
  /* ...full --base-* set... */
  text-wrap: pretty;

  transition: background-color var(--duration-base) var(--ease-standard), color var(--duration-base) var(--ease-standard);

  @media (prefers-reduced-motion) {
    transition-duration: 0s;
  }

  & :where(.h0, h1, .h1, h2, .h2, h3, .h3, h4, .h4, h5, .h5, h6, .h6) {
    color: var(--color-role-foreground-heading, inherit);
  }

  & :where(input, textarea, select) {
    background-color: var(--color-role-input-background);
    color: var(--color-role-input-text);
    border: 0.0625rem solid var(--color-role-input-border);
  }
  /* + :hover, :focus-visible, :disabled, ::placeholder per-state rules */
}
```

Body-level so theme typography + scheme colors cascade through every element — chrome, theme-roots, app sections. Apps without explicit styling adopt these defaults; apps with explicit styling override per normal cascade.

### 3. Theme-root: bleed grid (opt-in)

```css
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
[data-modifiers*='theme-root'] > * { grid-column: content-start / content-end; }

/* Desktop bleed (≥ 48rem) — opt-in via bleed-desktop:<value> */
@media (width >= 48rem) {
  [data-modifiers*='theme-root'] > [data-modifiers*='bleed-desktop:both']         { grid-column: bleed-start / bleed-end; }
  [data-modifiers*='theme-root'] > [data-modifiers*='bleed-desktop:inline_start'] { grid-column: bleed-start / content-end; }
  [data-modifiers*='theme-root'] > [data-modifiers*='bleed-desktop:inline_end']   { grid-column: content-start / bleed-end; }
}

/* Mobile bleed (< 48rem) — binary `both`-only enum */
@media (width < 48rem) {
  [data-modifiers*='theme-root'] > [data-modifiers*='bleed-mobile:both'] { grid-column: bleed-start / bleed-end; }
}
```

Three-track named-line grid. Side tracks absorb the gutter at narrow viewports (or the (viewport − content) excess at wide viewports); the center track caps at `--content-width` and is clamped to viewport minus gutter at narrow viewports. The `min(...)` clamp guarantees the content track never exceeds either the picked cap or the available width.

### 4. Block-rhythm cascade (theme-root direct children only)

```css
[data-modifiers*='theme-root'] > .shopify-block:not(:first-child) {
  margin-block-start: var(--mobile-margin-block-start, var(--block-rhythm, 0rem));

  @media (width >= 48rem) {
    margin-block-start: var(--desktop-margin-block-start, var(--block-rhythm, 0rem));
  }
}
```

Direct-child scope only. Nested blocks (inside `group` / `columns` / `media`) get their parent container's gap, not the section's rhythm. The `var()` chain resolves through 4 layers (per-block override → section's block-rhythm → 0rem floor) — see `dynamic-style-pattern.md` § Skip-on-default + var-fallback cascade.

### 5. Container-style variants

```css
:where(.shopify-block--group, .shopify-block--columns, .shopify-block--media)[data-modifiers*='container-style:card'] {
  padding: 1.5rem;
  border-radius: var(--radius-default);
  background-color: var(--color-role-background);
  box-shadow: 0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.08);
}
/* outlined + elevated variants follow the same selector shape with different rule bodies */
```

`:where()` keeps specificity at zero so per-block stylesheets and per-project overrides can re-style without escalation. Three seeded variants (`card` / `outlined` / `elevated`); per-project extensions add their own variant rules following the same selector shape — see `container-style.spec.md`.

## CSS

Described above in Output shape. The file is the CSS — no separate "CSS" surface beyond what each rule group documents.

## CSS custom properties (exposed)

N/A — this file consumes CSS variables from `design-constants.spec.md` + `utility--css-variables.spec.md` + `utility--block-layout-vars.spec.md`. It doesn't define new variables.

## Behavior

- **Five rule groups, by selector cohesion.** Each group's selector chain is the structural anchor; the rule body holds the styles. Pinned by description per `spec-convention.md` § Substrate stylesheets.
- **Outer-section wrapper applies universally.** `.shopify-section` styles ours + app sections + chrome equally. Only outer-flow concerns belong here. Content-level styling (typography, background, transitions) goes on `body` so it cascades through every element including apps.
- **Body-level appearance is the cascade fountainhead.** Every element inherits body's typography + color + transition defaults unless overridden. App sections without their own styling adopt these defaults; apps with explicit styling override per normal cascade.
- **Theme-root bleed grid opts in via the `theme-root` modifier.** Sections without the modifier render as block-level elements with no grid. Sections with it get the three-track named-line grid. Specialized sections that need their own layout opt out by overriding `display` per `theme-root.md` § Specialized-section opt-out.
- **Bleed-desktop and bleed-mobile are independent modifier dimensions.** A container can carry both (`bleed-desktop:both,bleed-mobile:both`) or either independently. Without `bleed-mobile`, a container with `bleed-desktop:both` stays in the content track at mobile (default placement). The enums differ: desktop offers 4 values (`none` / `inline_start` / `inline_end` / `both`); mobile is binary (`none` / `both`). The modifier value is the raw setting value (underscore); the grid-column selectors match it verbatim.
- **Block-rhythm is direct-child-scoped.** Only `> .shopify-block:not(:first-child)` of a theme-root gets the rhythm margin. Nested blocks (inside container blocks) read their parent container's gap setting instead. Prevents the section's inter-block spacing from compounding inside containers.
- **Block-rhythm cascade resolves through `var()` chain, not Liquid.** The per-block override → section rhythm → 0rem floor cascade is implemented entirely by the consumer-side `var(--upper, var(--lower, <floor>))` chain plus skip-on-default emission. See `dynamic-style-pattern.md` § Skip-on-default + var-fallback cascade.
- **Container-style selectors keep specificity at zero.** `:where()` wraps the block-class enum so the rule contributes no specificity. Per-block stylesheets + per-project overrides cascade naturally without `!important` or specificity wars.
- **Three-block enum on container-style is intentional.** `group` / `columns` / `media` are the three container blocks; the enum names them explicitly. Adding a fourth container block requires updating the selector chain on every variant rule. Trade-off documented in `container-style.spec.md` Out of scope (root-marker migration path).
- **`125rem` content-width fallback is the substrate's big-screen floor.** When no `content_width` is picked at the section or block level, the cap reads `125rem` (= 2000px at default 16px root). The fallback scales with root font-size; intended as a no-cap floor for ultra-wide displays.
- **No JavaScript dependency.** The file is pure CSS. Every behavior here resolves at the browser's layout step; no runtime helper is needed.

## A11y

- `prefers-reduced-motion` zeroes the body-level transition (`background-color`, `color`). Pairs with `design-constants.spec.md`'s view-transition reduced-motion override.
- `:focus-visible` outline on form inputs uses `--color-role-focus-ring` (an alias of `--color-role-primary`) + `0.125rem` (= 2px) thickness with `0.125rem` offset — matches the focus-ring scale documented in `design-constants.spec.md`.
- `:disabled` form inputs adopt `--color-role-disabled-*` tokens + `cursor: not-allowed` — visually disabled state aligned with scheme-role tokens.

## Locale keys

N/A — pure CSS.

## Validation

Per `validation-contract.md` Tier 1c (substrate / utility-css).

- **Tier**: substrate — utility-css sub-shape
- **Page(s)**: validation surface is split across `validation--substrate--theme-color.liquid` (scheme background + foreground + heading color rendered through the body cascade), per-block validation pages (block-rhythm + bleed + container-style variants), and section validation pages (theme-root bleed grid).
- **API surface** (matrix to exercise across consumers):
  - **Outer-section wrapper**: anchor links scroll to a section with `scroll-margin-block-start` honored; reduced-motion disables smooth scrolling
  - **Body cascade**: every text element inherits body typography unless overridden; every form input adopts scheme-role styling at idle / hover / focus / disabled states; placeholder color resolves to `--color-role-placeholder`
  - **Theme-root bleed grid**: a section with `theme-root` modifier renders the three-track grid; direct children land in the content track by default; containers with `bleed-desktop:<value>` opt into wider spans at desktop; containers with `bleed-mobile:both` opt into full bleed at mobile
  - **Block-rhythm cascade**: a section's children show inter-block margin per the resolution scenarios (per-block override / section rhythm / floor); nested blocks inside containers don't inherit the section's rhythm
  - **Container-style variants**: each of `card` / `outlined` / `elevated` applied to each of `group` / `columns` / `media` renders identically across the three container blocks
- **Edge cases**:
  - Section without `theme-root` modifier → no bleed grid; renders as block-level (some specialized sections opt out this way)
  - Block with both `bleed-desktop:both` and `bleed-mobile:both` → spans full bleed at all viewports
  - Block with `bleed-desktop:both` but no `bleed-mobile` → desktop full bleed, mobile content-track placement
  - Theme-root with no `content_width` → bleed grid uses the `125rem` fallback (= 2000px at default root)
  - Container-style handle without a matching variant rule → modifier emits, no variant styling applies, block renders with default chrome (diagnostic mode per `container-style.spec.md`)
  - `prefers-reduced-motion` → body transitions zero out (verified via DevTools computed styles)
- **Visual showcase intent**: a reader scanning the validation pages confirms (a) outer-flow rules don't bleed into app sections, (b) body typography + color cascade correctly through every element type, (c) the bleed grid produces the documented column placements per modifier, (d) the rhythm cascade respects per-block overrides + section rhythm + the 0rem floor, (e) container variants look identical across the three container blocks.
- **Assertions** (prose; Playwright once installed):
  - Computed `background` on `<body>` matches `--gradient-background` from the active scheme
  - Computed `font-family` on `<body>` starts with the `base_text_style`'s typeface name
  - Computed `grid-template-columns` on a theme-root carrying `theme-root` modifier produces a three-track named-line grid
  - Computed `margin-block-start` on the second `.shopify-block` direct child of a theme-root matches the resolution chain (per-block override → section rhythm → 0rem)
  - Computed `padding`, `border-radius`, `background-color`, `box-shadow` on a `group` / `columns` / `media` block carrying `container-style:card` produces the seeded values uniformly across the three block types
- **Unit scope**: none (pure CSS).

## Implementation-time decisions

- **Aggregator-file vs per-concern files.** The 5 rule groups could live in 5 separate files (`layer-theme-outer.css`, `layer-theme-body.css`, etc.) but the cascade interaction (outer applies universally, body cascades through, theme-root opts in) is easier to reason about when they're in one file with one `@layer theme` block. Multi-file would also force `utility--core-assets` to concatenate more inputs in fixed order.
- **`:where()` for container-style variants vs class-based selectors.** `:where()` keeps specificity at zero, so per-block stylesheets (e.g., `group.liquid`'s `{% stylesheet %}` block) can override without specificity escalation. A class-based selector would force per-block override rules to either escalate specificity or use `!important`.
- **Hardcoded values where the substrate variable exists.** The file currently hardcodes a few values that map numerically to substrate variables: form-input border uses `0.0625rem solid` rather than `var(--border-thin)`; focus-visible outline uses `0.125rem` rather than `var(--focus-ring-width)` and `0.125rem` rather than `var(--focus-ring-offset)`; container-style box-shadows use `rgba(0, 0, 0, 0.08)` and `rgba(0, 0, 0, 0.1)` rather than `--color-role-shadow`-derived alpha. Values match the substrate scale numerically but don't consume the variables. Future cleanup; not a contract concern (computed values are identical to the var-consuming form).
- **`:focus-visible` border-color override on form inputs.** Inside the body-level form-input cascade, `:focus-visible` sets `border-color: var(--color-role-primary)` in addition to the standard outline. The override is documented inline in the file but not surfaced as a named pattern in the spec body — captured here for the design-history record.

## Out of scope

- **Reset rules.** Covered by `assets/layer-reset.css` (`@layer reset` body); this file just inherits the layer order declared in `design-constants.spec.md`. The reset rules themselves are out of this spec's surface.
- **Substrate constants (z-index, motion, radius, border, touch-target, spacing defaults).** Owned by `design-constants.spec.md` (`assets/layer-base.css`). This file consumes them via `var()`.
- **Per-scheme color-role tokens.** Owned by `color-scheme.spec.md`; the per-scheme rule block in `utility--css-variables.liquid` populates `--color-role-*`. This file consumes via `var()`.
- **Text-style font properties.** Owned by `text-style.spec.md`; the `--<handle>-font-*` and `--base-*` aliases are populated by `utility--css-variables.liquid`. This file consumes via `var()`.
- **Per-block / per-section CSS rules.** Every block / section carries its own `{% stylesheet %}` block scoped to `.shopify-block--<name>` or the section's element. This file only carries rules that apply across multiple blocks / sections (outer-flow, body cascade, bleed grid, rhythm cascade, container variants).
- **Utility classes (`sr-only`, `prose`, etc.).** Owned by `assets/layer-utilities.css` (planned spec). This file doesn't carry utility-class rules.
- **Per-block bleed override mechanism details.** The bleed-modifier emission (which blocks emit which `bleed-*` modifiers) lives in each container block's spec. This file carries the consumption — the CSS rules that read the modifiers — only.
- **`@view-transition` opt-in + reduced-motion override.** Owned by `design-constants.spec.md` (the at-rule lives in `layer-base.css`). This file's reduced-motion override is body-transition-specific.

## Related

- `design-constants.spec.md` — sibling substrate CSS (`assets/layer-base.css`); provides the constants this file consumes (`--duration-*`, `--ease-*`, `--radius-default`)
- `utility--css-variables.spec.md` — emits the `--color-role-*` scheme tokens, `--base-*` text-style aliases, `--gradient-background`, `--gutter`, `--spacing-*` that this file consumes
- `utility--block-layout-vars.spec.md` — emits the per-instance `--mobile-margin-block-start` / `--desktop-margin-block-start` / `--content-width` that the bleed-grid + rhythm cascade consume
- `container-style.spec.md` — handle catalog for the variant rules (`card` / `outlined` / `elevated` + per-project extensions)
- `.context/docs/theme-root.md` — the `theme-root` modifier contract (identity, bleed grid, rhythm scope, specialized-section opt-out)
- `.context/docs/subgrid-migration.md` — the migration that introduced the bleed-grid + theme-root architecture
- `.context/docs/dynamic-style-pattern.md` § Skip-on-default + var-fallback cascade — the multi-layer pattern the block-rhythm cascade implements
- `.context/rules/section-convention.md` — outer-section vs inner-root architecture; explains why outer-flow lives universally and content-level lives on body
