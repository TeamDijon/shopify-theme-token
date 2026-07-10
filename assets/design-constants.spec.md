# design-constants

**Layer**: substrate

**Type**: utility-css (`assets/layer-base.css`)

**Status**: shipped

**Implementation**: `assets/layer-base.css` `:root` block — scheme-independent design constants (z-index scale, motion vars, focus-ring metrics, border-radius scale, border-width scale, touch-target floor, spacing scale); substrate stylesheet pinned by description per `spec-convention.md` § Substrate stylesheets

**Reconciled**: 2026-06-29 (consumer pin refresh — `button.liquid` and `media.liquid` bumped to v1.5.2 for the block-alignment change; the design constants this spec describes are unchanged. Prior: 2026-06-01, the cycle adding border-width scale + AA touch-target floor + T-shirt spacing scale; spacing scale entries align with `spacing` metaobject handles for per-project override via cascade position in `utility--css-variables` v1.13.0)

**Reviewed**: 2026-06-04

**Depends on**: none — leaf substrate; consumed by every other layer

**Consumers**:
- `assets/layer-theme.css` — body transition (`var(--duration-base) var(--ease-standard)`), reduced-motion override (`transition-duration: 0s`), container-style variants (`var(--radius-default)`), block-rhythm cascade (`var(--block-rhythm)` — set per-section as `var(--spacing-<picked-handle>)`)
- `snippets/utility--css-variables.liquid` v1.14.1 — overrides matching spacing handles with `spacing` metaobject values (mobile in `:root`, desktop in nested `@media`); cascade position drives the override
- `snippets/button.liquid` v1.5.2 — transitions (`var(--duration-fast) var(--ease-out)`), focus ring (`var(--color-role-focus-ring)` + `--focus-ring-width` / `--focus-ring-offset`)
- `snippets/icon.liquid` v1.4.1, `snippets/media.liquid` v1.5.2, every consumer of border-radius — read `--radius-*` for shape language
- `assets/layer-utilities.css` — focus-visible patterns reading `--focus-ring-width` / `--focus-ring-offset`
- Anywhere using `var(--layer-*)` for z-index stacking — sticky headers, drawers, dropdown menus, overlays
- Anywhere using `var(--spacing-<slot>)` for component padding / gap / inset — substrate-aligned slots provide static defaults, with per-instance override via the indirection pattern (`padding: var(--component-spacing, var(--spacing-md))`)
- Anywhere using `var(--border-*)` for hairline / accent / emphasized border weights
- Interactive components reading `var(--touch-target-min)` for AA-floor sizing (buttons, tooltip triggers, form controls)

## Purpose

The scheme-independent design constants: invariants that don't move with color scheme or text style and that anchor the theme's shape language. Seven scales (z-index, motion durations, motion easings, focus-ring, border-radius, border-width, spacing — plus the touch-target floor as a singleton) live here because they share a property: per-project tunable in one place, referenced by name everywhere else. Plus the cascade-layer declaration that opens the file, the `@view-transition` progressive-enhancement opt-in, and the reduced-motion override for view transitions.

The file is the *substrate substrate*: every other layer (`layer-reset.css`, `layer-theme.css`, `layer-utilities.css`, every component CSS block) depends on its constants. By centralizing them, a project's brand calibration (rounder corners, slower motion, deeper z-stacking, tighter or looser spacing) is a single-file edit that propagates by variable reference.

The **spacing scale** has a second override path beyond the layer-base.css defaults: the `spacing` metaobject auto-emits `--spacing-<handle>` for every entry from `utility--css-variables` (mobile in `:root`, desktop in nested `@media`). Entries with handles matching the substrate T-shirt slots (`xs` / `sm` / `md` / `lg` / `xl`) override the substrate defaults via cascade position — same variable namespace, later wins. Entries with custom handles add new spacing slots that coexist with the substrate scale. Two-tier authoring: components read `var(--spacing-md)` for static sensible defaults; per-instance dynamic style swaps via the indirection pattern (`var(--component-spacing, var(--spacing-md))` + `--component-spacing: var(--spacing-<picked>)` from per-block setting).

## API

CSS custom properties on `:root`. No Liquid layer; no params. Consumed via `var(--<name>)` from any cascade scope.

## Output shape

```css
@layer reset, theme, components, utilities;

:root {
  /* z-index scale (7 layers, gaps of 100) */
  --layer-below: -1;
  --layer-base: 0;
  --layer-raised: 100;
  --layer-sticky: 200;
  --layer-overlay: 300;
  --layer-drawer: 400;
  --layer-temporary: 500;

  /* motion */
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 320ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-emphasized: cubic-bezier(0.3, 0, 0, 1);
  --ease-out: cubic-bezier(0.33, 1, 0.68, 1);

  /* focus ring (color is scheme-driven via --color-role-focus-ring) */
  --focus-ring-width: 0.125rem;
  --focus-ring-offset: 0.125rem;

  /* border-radius scale */
  --radius-none: 0;
  --radius-small: 0.25rem;
  --radius-default: 0.5rem;
  --radius-large: 1rem;
  --radius-pill: 9999px;

  /* border-width scale (px on purpose — borders are device-relative weight) */
  --border-thin: 1px;
  --border-default: 2px;
  --border-thick: 3px;

  /* a11y — AA touch-target floor */
  --touch-target-min: 2.75rem;

  /* spacing scale — T-shirt slots; `spacing` metaobject entries override these via cascade position */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2.5rem;
}

@view-transition {
  navigation: auto;
}

@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none;
  }
}
```

## CSS

Documented above. The constants are flat on `:root`; no component-rooted CSS in this file.

## CSS custom properties (exposed)

| Group | Variable | Value | Purpose |
|---|---|---|---|
| Z-index | `--layer-below` | `-1` | Pseudo-elements behind content (background patterns, decorative overlays) |
| | `--layer-base` | `0` | Default stacking — explicit reset when needed |
| | `--layer-raised` | `100` | Elevated cards, focused inputs |
| | `--layer-sticky` | `200` | Sticky headers, scroll-pinned UI |
| | `--layer-overlay` | `300` | Modals, dropdowns, popovers |
| | `--layer-drawer` | `400` | Side drawers (cart, nav, filter) — above modals |
| | `--layer-temporary` | `500` | Toasts, alerts, transient announcements |
| Motion (duration) | `--duration-fast` | `120ms` | Micro-interactions (button hover, focus ring fade) |
| | `--duration-base` | `200ms` | Standard transitions (color-scheme switch, panel expand) |
| | `--duration-slow` | `320ms` | Slower transitions (modal in/out, page-level changes) |
| Motion (easing) | `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default acceleration curve (Material-style decelerate) |
| | `--ease-emphasized` | `cubic-bezier(0.3, 0, 0, 1)` | Stronger emphasis for prominent transitions |
| | `--ease-out` | `cubic-bezier(0.33, 1, 0.68, 1)` | Quick start, gentle land (button-style interactions) |
| Focus ring | `--focus-ring-width` | `0.125rem` | Outline thickness on `:focus-visible` |
| | `--focus-ring-offset` | `0.125rem` | Outline offset from the element edge |
| Border-radius | `--radius-none` | `0` | Sharp corners — explicit reset when needed |
| | `--radius-small` | `0.25rem` | Subtle softening (inputs, small chips) |
| | `--radius-default` | `0.5rem` | Standard cards, buttons, containers |
| | `--radius-large` | `1rem` | Prominent surfaces (hero panels, feature cards) |
| | `--radius-pill` | `9999px` | Fully rounded — pills, badges, circular buttons |
| Border-width | `--border-thin` | `1px` | Hairline separators, default borders |
| | `--border-default` | `2px` | Standard emphasis (button outlines, focus-ring weight basis) |
| | `--border-thick` | `3px` | Strong emphasis (active state, prominent dividers) |
| A11y | `--touch-target-min` | `2.75rem` | AA touch-target floor (44px at 16px root). Interactive elements compose via `min-block-size: var(--touch-target-min); min-inline-size: var(--touch-target-min);` |
| Spacing | `--spacing-xs` | `0.25rem` | Extra-small inset / gap |
| | `--spacing-sm` | `0.5rem` | Small inset / gap |
| | `--spacing-md` | `1rem` | Medium inset / gap (default sensible component padding) |
| | `--spacing-lg` | `1.5rem` | Large inset / gap |
| | `--spacing-xl` | `2.5rem` | Extra-large inset / gap |

## Behavior

- **Scheme independence.** Every variable in this file is scheme-independent — the values don't move when a color scheme changes. Scheme-dependent constants (`--color-role-*`, `--gradient-background`) live in the per-scheme block of `utility--css-variables.liquid` instead.
- **Z-index gaps of 100.** Each named layer leaves room to insert intermediate layers per-project (`--layer-card-raised: 150`, etc.). The 7 named layers cover the theme's standard surfaces; per-project values nest between them. Third-party overlays (apps, embedded widgets) intentionally sit above `--layer-temporary` — the theme deliberately doesn't reach that high.
- **Focus-ring color is *not* in this file.** The width and offset are scheme-independent (a fixed measurement); the color (`--color-role-focus-ring`, an alias of `--color-role-primary`) is scheme-dependent and lives in the per-scheme block. Consumers compose: `outline: var(--focus-ring-width) solid var(--color-role-focus-ring)`.
- **Easing curves prefer `cubic-bezier(...)` over keyword aliases.** Specific control points read across browsers; named easings (`ease-out`, `ease-in-out`) drift over time as engines refine defaults. The three named curves (`standard` / `emphasized` / `out`) cover the theme's common motion intents — additional intents earn their own named curve rather than inlining `cubic-bezier(...)` in component CSS.
- **Border-radius scale uses rem (except `pill`).** Rem scales with root font-size so radius feels consistent against text. The `pill` value is a magic `9999px` (effectively infinite) to fully round any height — using rem here would risk under-rounding at very-large block sizes. The convention is: pixel-magic only when the value is intentionally height-relative (pill); otherwise rem.
- **Border-width scale uses px on purpose.** A user setting a larger root font wants larger text and larger spacing, not thicker borders — border weight is a device-pixel concept, not a user-typography-relative one. The px choice mirrors industry convention (Tailwind, Bootstrap, Material). Pairs with `--radius-pill`'s pixel-magic rationale: px when the value is intentionally device-relative.
- **`--touch-target-min` is the AA floor.** Apply via `min-block-size` + `min-inline-size` on the interactive container (not `padding` — padding shrinks under content; min-size holds regardless). A11y conventions name 44×44px as the AA minimum; the substrate constant materializes the rule as a single referenced value. Per-project AAA opt-in raises the value at the `:root` level (`--touch-target-min: 3rem` for ~48px).
- **Spacing scale uses rem; metaobject overrides also emit rem.** Substrate rem values scale with root font-size — components default to user-typography-relative spacing. The `spacing` metaobject's `mobile_value` / `desktop_value` fields are px integers (merchant authoring is in px — concrete numeric input), but the emitter converts them to rem at emit time (`divided_by: 16.0 | round: 3`) so the override unit matches the substrate unit. Both tiers resolve to rem in computed styles; a merchant adjusting root font-size scales every spacing slot consistently regardless of whether the value comes from the substrate default or a metaobject override.
- **Spacing override is cascade-driven, not auto-bind.** Two emitters write to the same `--spacing-<handle>` namespace: substrate (`layer-base.css`) emits the T-shirt slots; `utility--css-variables` emits the metaobject loop later in the same `:root`. Matching handles override by cascade position; non-matching handles add new slots that coexist. The "auto-bind" framing used for `text_style`'s `h1`–`h6` (handle → HTML tag selector) doesn't apply — spacing has no semantic HTML anchor, just shared variable names.
- **Spacing responsiveness propagates through `var()`.** The metaobject emits `--spacing-<handle>: <mobile>rem` in `:root` and `--spacing-<handle>: <desktop>rem` in nested `@media (width >= 48rem)`. Consumers reading `var(--spacing-md)` resolve responsively at use-site (CSS variables are substituted at used-value time per spec). A per-section `--block-rhythm: var(--spacing-<handle>)` propagates the responsive resolution through the chain — layer-theme.css reads `var(--block-rhythm)` once, gets the right value per breakpoint.
- **`@layer reset, theme, components, utilities;`** declares the cascade order at the very top of the substrate. Every CSS file in the theme places its rules inside one of the four named layers via `@layer <name> { … }`. Later layers win cascade ties against earlier layers regardless of specificity. The declaration is in `layer-base.css` because that file loads first in the inline-CSS sequence (per `utility--core-assets.liquid`'s concatenation order).
- **`@view-transition { navigation: auto; }` is progressive enhancement.** Browsers that don't support cross-document view transitions (currently anything older than Chromium 126 / Safari 18.2) ignore the at-rule silently. No polyfill, no JS fallback — supported browsers get the animated page transitions; others get instant navigation.
- **Reduced-motion zeroes view-transition animations.** The `@media (prefers-reduced-motion: reduce)` block sets `animation: none` on every view-transition pseudo-element — the entire group + old + new. Cross-document view transitions still happen, but instantaneously. The theme's per-element transitions (`var(--duration-*)`) are zeroed independently in `layer-theme.css` and component CSS.

## Locale keys

N/A — design constants, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1c (substrate / utility-css).

- **Tier**: substrate — utility-css sub-shape
- **Source**: colocated `assets/design-constants.validation.json` source + `assets/design-constants.test.js` — generate-and-drop through the `?view=validation` slot *(planned)*. The matrix would surface all four scales as labeled swatches: z-index layers via positioned overlays, motion via interactive timing demonstrations, focus-ring via tabbable inputs, border-radius via container shapes.
- **API surface** (matrix to exercise):
  - **Z-index layers**: 7 boxes, each positioned with a different `z-index: var(--layer-*)`, overlapping; reader confirms stack order matches `below` (under) → `temporary` (top).
  - **Motion durations + easings**: hover-triggered transitions, one card per duration × easing matrix (9 combinations); reader feels the perceptual difference and confirms the slow/emphasized one reads noticeably longer than fast/out.
  - **Focus ring**: a row of tabbable inputs, reader Tab-cycles; outline picks up `var(--color-role-focus-ring)` color + `var(--focus-ring-width)` thickness + `var(--focus-ring-offset)` gap.
  - **Border-radius**: 5 boxes labeled `none`, `small`, `default`, `large`, `pill`; reader confirms each corner radius matches the documented value.
  - **Border-width**: 3 boxes with `border: var(--border-thin/default/thick) solid currentColor`; reader confirms visual weight matches the documented px values.
  - **Touch-target floor**: a button styled `min-block-size: var(--touch-target-min); min-inline-size: var(--touch-target-min);` rendered alongside a sub-floor button (no min-size) for visual reference; reader confirms the min-sized button reaches AA (44×44px at 16px root) regardless of content.
  - **Spacing scale**: 5 boxes labeled `xs`, `sm`, `md`, `lg`, `xl` with `padding: var(--spacing-<slot>)` against a content box; reader confirms padding scales through the slots. A second row demonstrates metaobject override — a seeded `md` entry emits a custom value via the cascade; reader confirms the override wins over the substrate default (DevTools resolved `--spacing-md` shows the metaobject value, not `1rem`).
- **Edge cases**:
  - `prefers-reduced-motion: reduce` toggle in DevTools → all transitions zero-out (verified via DevTools computed styles + visual inspection); view-transition animations also zero per the `@view-transition` reduced-motion rule
  - High-contrast (`forced-colors: active`) — focus ring inherits system focus styling; `--focus-ring-*` values become decorative-only
  - Browser without `@view-transition` support — page navigation is instant; the at-rule is silently ignored
- **Visual showcase**: a single page surfacing all four scales as labeled swatches. The page doubles as a per-project calibration reference: a designer tweaking radius or motion can see all values at a glance.
- **Assertions** (prose; Playwright once installed):
  - Computed `--layer-overlay` on `:root` equals `300`.
  - Computed `transition-duration` on an element styled `transition: var(--duration-base) var(--ease-standard)` is `200ms`.
  - Computed `outline-width` on a focused input styled `outline: var(--focus-ring-width) solid var(--color-role-focus-ring)` is `0.125rem` (= 2px at default root font-size).
  - Computed `border-radius` on an element styled `border-radius: var(--radius-default)` is `0.5rem`.
  - Computed `border-width` on an element styled `border-width: var(--border-default)` is `2px` (consistent across root-font-size changes).
  - Computed `min-block-size` on an element styled `min-block-size: var(--touch-target-min)` is `2.75rem` (resolves to 44px at default root font-size).
  - Computed `--spacing-md` on `:root` equals `1rem` when no `md`-handled spacing metaobject entry exists; equals `mobile_value / 16` rem at viewport `< 48rem` and `desktop_value / 16` rem at viewport `>= 48rem` when an entry exists (emitter applies the px→rem conversion at emit time). Verifiable via `getComputedStyle(document.documentElement).getPropertyValue('--spacing-md')`.
  - With `prefers-reduced-motion: reduce`, computed `animation-duration` on `::view-transition-group(*)` is `0s`.
- **Unit scope**: none (pure CSS).

## Out of scope

- **Scheme-dependent constants** — colors (`--color-role-*`), gradients (`--gradient-*`), typography (`--<style>-font-*`, `--base-*`), gutters (`--gutter`) live in `utility--css-variables.liquid` because they're scheme- or settings-driven. This file is for scheme-independent invariants only.
- **CSS reset rules** — covered by `assets/layer-reset.css` (`@layer reset` body). This file just *declares* the layer order; the reset rules themselves are out of scope.
- **Component / utility CSS** — `assets/layer-theme.css` carries body appearance + bleed grid + rhythm cascade + container-style variants; `assets/layer-utilities.css` carries the `sr-only`, `prose`, and other utility classes. Both reference constants from this file but contribute their own rules elsewhere.
- **Per-project radius / motion / z-index / focus-ring overrides** — no designated override slot today. Practical paths: (a) fork-and-edit `layer-base.css` directly for one-off per-project tuning of constants that haven't earned merchant-tunable surface; (b) promote the constant to a metaobject when broadly tunable (the spacing scale took this path — entries override substrate defaults via cascade position in `utility--css-variables`, per the spacing override bullet in Behavior). The token catalog here is the *theme's* defaults.
- **JS-driven animations** — `--duration-*` and `--ease-*` are CSS-only constants. JS animation libraries (GSAP, Motion One, Web Animations API) that read these values are per-project; the theme doesn't ship a JS motion layer.
- **Focus-ring color** — lives in the per-scheme block of `utility--css-variables.liquid` as `--color-role-focus-ring`. This file owns the *shape* of the ring (width, offset), not its color.
- **Variable-font weight axes / responsive type scale** — typography variables live in `utility--css-variables` (text-style block) and `text_style` metaobject entries. This file is shape + motion + stacking, not type.

## Related

- `utility--css-variables.spec.md` — the scheme-dependent counterpart. The two files together cover the theme's full CSS-variable surface: constants here, scheme/settings-driven there.
- `theme-color.spec.md`, `text-style.spec.md`, `gradient.spec.md`, `container-style.spec.md` — sibling substrate specs covering the design-system metaobjects. They depend on constants from this file (`--radius-*` for container-style variants, `--duration-*` for transitions).
- `.context/docs/asset-loading.md` — explains the inline-CSS asset routing through `utility--core-assets`. `layer-base.css` is the first of the four per-layer files concatenated into the inline `<style>` block.
- `.context/docs/css-standards.md` — component-rooted CSS naming, cascade layers convention, `:focus-visible` patterns.
- `.context/rules/a11y-conventions.md` — focus + reduced-motion accessibility rules consumed by this file's reduced-motion override and focus-ring contract.
