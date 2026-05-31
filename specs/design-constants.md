# design-constants

**Layer**: substrate

**Type**: utility-css (`assets/layer-base.css`)

**Status**: shipped

**Implementation**: `assets/layer-base.css` `:root` block — scheme-independent design constants (z-index scale, motion vars, focus-ring metrics, border-radius scale); substrate stylesheet pinned by description per `spec-convention.md` § Substrate stylesheets

**Reconciled**: 2026-05-31

**Reviewed**: pending

**Depends on**: none — leaf substrate; consumed by every other layer

**Consumers**:
- `assets/layer-theme.css` — body transition (`var(--duration-base) var(--ease-standard)`), reduced-motion override (`transition-duration: 0s`), container-style variants (`var(--radius-default)`)
- `snippets/button.liquid` — transitions (`var(--duration-fast) var(--ease-out)`), focus ring (`var(--color-role-focus-ring)` + `--focus-ring-width` / `--focus-ring-offset`)
- `snippets/icon.liquid`, `snippets/media.liquid`, every consumer of border-radius — read `--radius-*` for shape language
- `assets/layer-utilities.css` — focus-visible patterns reading `--focus-ring-width` / `--focus-ring-offset`
- Anywhere using `var(--layer-*)` for z-index stacking — sticky headers, drawers, dropdown menus, overlays

## Purpose

The scheme-independent design constants: invariants that don't move with color scheme or text style and that anchor the theme's shape language. Four scales (z-index, motion, focus-ring, border-radius) live here because they share a property: per-project tunable in one place, referenced by name everywhere else. Plus the cascade-layer declaration that opens the file, the `@view-transition` progressive-enhancement opt-in, and the reduced-motion override for view transitions.

The file is the *substrate substrate*: every other layer (`layer-reset.css`, `layer-theme.css`, `layer-utilities.css`, every component CSS block) depends on its constants. By centralizing them, a project's brand calibration (rounder corners, slower motion, deeper z-stacking) is a single-file edit that propagates by variable reference.

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

## Behavior

- **Scheme independence.** Every variable in this file is scheme-independent — the values don't move when a color scheme changes. Scheme-dependent constants (`--color-role-*`, `--gradient-background`) live in the per-scheme block of `utility--css-variables.liquid` instead.
- **Z-index gaps of 100.** Each named layer leaves room to insert intermediate layers per-project (`--layer-card-raised: 150`, etc.). The 7 named layers cover the theme's standard surfaces; per-project values nest between them. Third-party overlays (apps, embedded widgets) intentionally sit above `--layer-temporary` — the theme deliberately doesn't reach that high.
- **Focus-ring color is *not* in this file.** The width and offset are scheme-independent (a fixed measurement); the color (`--color-role-focus-ring`, an alias of `--color-role-primary`) is scheme-dependent and lives in the per-scheme block. Consumers compose: `outline: var(--focus-ring-width) solid var(--color-role-focus-ring)`.
- **Easing curves prefer `cubic-bezier(...)` over keyword aliases.** Specific control points read across browsers; named easings (`ease-out`, `ease-in-out`) drift over time as engines refine defaults. The three named curves (`standard` / `emphasized` / `out`) cover the theme's common motion intents — additional intents earn their own named curve rather than inlining `cubic-bezier(...)` in component CSS.
- **Border-radius scale uses rem (except `pill`).** Rem scales with root font-size so radius feels consistent against text. The `pill` value is a magic `9999px` (effectively infinite) to fully round any height — using rem here would risk under-rounding at very-large block sizes. The convention is: pixel-magic only when the value is intentionally height-relative (pill); otherwise rem.
- **`@layer reset, theme, components, utilities;`** declares the cascade order at the very top of the substrate. Every CSS file in the theme places its rules inside one of the four named layers via `@layer <name> { … }`. Later layers win cascade ties against earlier layers regardless of specificity. The declaration is in `layer-base.css` because that file loads first in the inline-CSS sequence (per `utility--core-assets.liquid`'s concatenation order).
- **`@view-transition { navigation: auto; }` is progressive enhancement.** Browsers that don't support cross-document view transitions (currently anything older than Chromium 126 / Safari 18.2) ignore the at-rule silently. No polyfill, no JS fallback — supported browsers get the animated page transitions; others get instant navigation.
- **Reduced-motion zeroes view-transition animations.** The `@media (prefers-reduced-motion: reduce)` block sets `animation: none` on every view-transition pseudo-element — the entire group + old + new. Cross-document view transitions still happen, but instantaneously. The theme's per-element transitions (`var(--duration-*)`) are zeroed independently in `layer-theme.css` and component CSS.

## Locale keys

N/A — design constants, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1c (substrate / utility-css).

- **Tier**: substrate — utility-css sub-shape
- **Page(s)**: `sections/validation--utility-css--design-constants.liquid` + `templates/index.validation--utility-css--design-constants.json` *(planned — does not exist today)*. The page would surface all four scales as labeled swatches: z-index layers via positioned overlays, motion via interactive timing demonstrations, focus-ring via tabbable inputs, border-radius via container shapes.
- **API surface** (matrix to exercise):
  - **Z-index layers**: 7 boxes, each positioned with a different `z-index: var(--layer-*)`, overlapping; reader confirms stack order matches `below` (under) → `temporary` (top).
  - **Motion durations + easings**: hover-triggered transitions, one card per duration × easing matrix (9 combinations); reader feels the perceptual difference and confirms the slow/emphasized one reads noticeably longer than fast/out.
  - **Focus ring**: a row of tabbable inputs, reader Tab-cycles; outline picks up `var(--color-role-focus-ring)` color + `var(--focus-ring-width)` thickness + `var(--focus-ring-offset)` gap.
  - **Border-radius**: 5 boxes labeled `none`, `small`, `default`, `large`, `pill`; reader confirms each corner radius matches the documented value.
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
  - With `prefers-reduced-motion: reduce`, computed `animation-duration` on `::view-transition-group(*)` is `0s`.
- **Unit scope**: none (pure CSS).

## Out of scope

- **Scheme-dependent constants** — colors (`--color-role-*`), gradients (`--gradient-*`), typography (`--<style>-font-*`, `--base-*`), gutters (`--gutter`) live in `utility--css-variables.liquid` because they're scheme- or settings-driven. This file is for scheme-independent invariants only.
- **CSS reset rules** — covered by `assets/layer-reset.css` (`@layer reset` body). This file just *declares* the layer order; the reset rules themselves are out of scope.
- **Component / utility CSS** — `assets/layer-theme.css` carries body appearance + bleed grid + rhythm cascade + container-style variants; `assets/layer-utilities.css` carries the `sr-only`, `prose`, and other utility classes. Both reference constants from this file but contribute their own rules elsewhere.
- **Per-project radius / motion overrides** — projects redefine variables in their own override stylesheet or via theme settings (when surfaced). The token catalog here is the *theme's* defaults; project overrides ride the cascade.
- **JS-driven animations** — `--duration-*` and `--ease-*` are CSS-only constants. JS animation libraries (GSAP, Motion One, Web Animations API) that read these values are per-project; the theme doesn't ship a JS motion layer.
- **Focus-ring color** — lives in the per-scheme block of `utility--css-variables.liquid` as `--color-role-focus-ring`. This file owns the *shape* of the ring (width, offset), not its color.
- **Variable-font weight axes / responsive type scale** — typography variables live in `utility--css-variables` (text-style block) and `text_style` metaobject entries. This file is shape + motion + stacking, not type.

## Related

- `utility--css-variables.md` — the scheme-dependent counterpart. The two files together cover the theme's full CSS-variable surface: constants here, scheme/settings-driven there.
- `theme-color.md`, `text_style.md`, `gradient.md`, `container-style.md` — sibling substrate specs covering the design-system metaobjects. They depend on constants from this file (`--radius-*` for container-style variants, `--duration-*` for transitions).
- `.context/docs/asset-loading.md` — explains the inline-CSS asset routing through `utility--core-assets`. `layer-base.css` is the first of the four per-layer files concatenated into the inline `<style>` block.
- `.context/docs/css-standards.md` — component-rooted CSS naming, cascade layers convention, `:focus-visible` patterns.
- `.context/rules/a11y-conventions.md` — focus + reduced-motion accessibility rules consumed by this file's reduced-motion override and focus-ring contract.
