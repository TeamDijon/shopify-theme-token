# layer-reset

**Layer**: substrate

**Type**: utility-css (`assets/layer-reset.css`)

**Status**: shipped

**Implementation**:
- `assets/layer-reset.css` `@layer reset` — opinionated CSS reset wrapping every rule under the named cascade layer; pinned by description per `spec-convention.md` § Substrate stylesheets

**Reconciled**: 2026-06-05

**Reviewed**: pending

**Depends on**:
- `var(--focus-ring-width)`, `var(--focus-ring-offset)`, `var(--color-role-focus-ring)` (CSS custom properties from `design-constants.md` + `color-scheme.md`) — consumed by the `:focus-visible` rule

**Consumers**:
- `snippets/utility--core-assets.liquid` — captures this file via `utility--inline-asset` and concatenates it into the head's first `<style>` block alongside `layer-base.css`, `layer-theme.css`, `layer-utilities.css`

## Purpose

The opinionated CSS reset — a single `@layer reset { … }` block that establishes baseline element behavior before any component CSS runs. Wraps `*` box-sizing, native-element zeroing, accessibility chrome (focus rings, reduced-motion + forced-colors handling, AA touch-target floor), and modern-browser opt-ins (`interpolate-size`, `text-wrap: balance` / `pretty`).

The cascade-layer wrapper is the design point: every rule inside `@layer reset` loses to every rule outside any layer (and to every rule in higher-position layers — `base`, `theme`, `utilities`). Components don't need to fight specificity to override reset behavior; they declare their rule and the layer-position cascade does the right thing.

## Pinning

Substrate stylesheets pin by description per `spec-convention.md` § Substrate stylesheets — versioning the file as a whole would force every spec pinning it to reconcile on every edit. The structural anchor is the `@layer reset` block; freshness is the `Reconciled` date.

## Rule groups (read order matches the file)

### Box model + zeroing

| Selector | Rules | Purpose |
|---|---|---|
| `*, *::before, *::after` | `box-sizing: border-box` | Inclusive box model |
| `*` | `margin: 0; padding: 0` | Zero everything; components opt back in |

### Document defaults

| Selector | Rules | Purpose |
|---|---|---|
| `html` | `text-size-adjust: none; font-size: 100%; tab-size: 4` | Prevent mobile-Safari text-size auto-bumping; honor user's root font size (consumed by px→rem emission, see `px-rem-emission.md`); align tab widths in `<pre>` |
| `body` | `min-height: 100vh / 100dvh; line-height: 1.5; font-family: <stack>; font-smoothing` | Minimum-height anchor + readable defaults + cross-platform `system-ui` stack as the substrate font (typeface metaobjects layer above) |

### Typography wrap defaults

| Selector | Condition | Rules |
|---|---|---|
| `h1`-`h6`, `button`, `input`, `label` | always | `line-height: 1.1` (tight) |
| `h1`-`h6` | `@supports (text-wrap: balance)` | `text-wrap: balance` (display-text balancing) |
| `p` | `@supports (text-wrap: pretty)` | `text-wrap: pretty` (paragraph hyphenation hints) |

`:where(...)` keeps specificity at 0 — component-level type rules override without fighting.

### Replaced elements + form controls

| Selector | Rules | Purpose |
|---|---|---|
| `img, picture, video, canvas, svg` | `display: block; max-inline-size: 100%; block-size: auto` | Fluid replaced elements |
| `input, button, textarea, select` | `font: inherit; color: inherit` | Inherit from parent typography |
| `textarea:not([rows])` | `min-block-size: 10em` | Readable textarea default when `rows` is omitted |

### Lists + links

| Selector | Rules | Purpose |
|---|---|---|
| `ul[class], ol[class]` | `list-style: none` | Classed lists drop bullets — components opt in to bullets explicitly |
| `ul[role="list"], ol[role="list"]` | `list-style: none` | Same for ARIA-listed lists (preserves SR semantics) |
| `a:not([class])` | `text-decoration-skip-ink: auto; color: currentcolor` | Unclassed anchors inherit color; classed anchors style explicitly |

### Inline + small text

| Selector | Rules |
|---|---|
| `code, kbd, samp, pre` | `font-family: ui-monospace, …; font-size: 1em` |
| `b, strong` | `font-weight: bolder` |
| `small` | `font-size: 80%` |
| `sub, sup` | `font-size: 75%; line-height: 0; position: relative; vertical-align: baseline` |
| `sub` | `bottom: -0.25em` |
| `sup` | `top: -0.5em` |

### Tables + horizontal rules

| Selector | Rules |
|---|---|
| `table` | `border-collapse: collapse; border-spacing: 0` |
| `hr` | `block-size: 0; color: inherit; border: 0; border-block-start: 0.0625rem solid` (1px equivalent) |

### Form-control defaults

| Selector | Rules |
|---|---|
| `button` | `background: transparent; border: none; cursor: pointer; padding: 0` |
| `[type="search"]` | `appearance: textfield; outline-offset: -0.125rem` |
| `::-webkit-search-decoration` | `appearance: none` |
| `::-moz-focus-inner` | `border-style: none; padding: 0` |

### Focus

| Selector | Rules | Purpose |
|---|---|---|
| `:focus-visible` | `outline: var(--focus-ring-width) solid var(--color-role-focus-ring, currentcolor); outline-offset: var(--focus-ring-offset)` | Visible focus on keyboard nav, sourced from substrate variables |
| `:focus:not(:focus-visible)` | `outline: none` | Suppress mouse-focus outline |

### Touch targets (AA)

| Selector | Rules | Purpose |
|---|---|---|
| `button, input, select, textarea, a` | `min-block-size: 3rem; min-inline-size: 3rem` | 48px AA touch target on `<a>` + interactive controls (see `a11y-conventions.md` § Touch targets — 44×44px is the iOS floor; this is more generous) |
| `p a, li a, td a` | `min-block-size: auto; min-inline-size: auto` | Inline anchors inside flow text don't size up — would break paragraph wrapping |

### Disabled + hidden

| Selector | Rules |
|---|---|
| `:disabled` | `cursor: not-allowed; opacity: 0.6` |
| `[hidden]` | `display: none !important` |

### Native elements

| Selector | Rules |
|---|---|
| `dialog` | `max-inline-size: 90vw; max-block-size: 90vh; margin: auto; padding: 0; border: none` |
| `summary` | `display: list-item; cursor: pointer` |
| `pre` | `white-space: pre-wrap; word-wrap: break-word` |

### Touch + scroll

| Selector | Rules | Purpose |
|---|---|---|
| `a, button, input, select, textarea` | `-webkit-tap-highlight-color: transparent` | Suppress the gray Mobile-Safari tap flash |
| `:focus` | `scroll-margin-block: 5rem` | Keyboard focus scrolls with 5rem padding above the focused element (clears sticky chrome) |

### Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Global override — `!important` is intentional, the user-preference signal is authoritative over component animation choices.

### `interpolate-size: allow-keywords` opt-in

```css
@supports (interpolate-size: allow-keywords) {
  @media (prefers-reduced-motion: no-preference) {
    html {
      interpolate-size: allow-keywords;
    }
  }
}
```

Enables animation between `auto` and intrinsic-size keywords (e.g. `height: 0 → height: auto`). Gated on `@supports` (newer browsers) and reduced-motion. `layer-utilities.css` uses this opt-in for `<details>` open/close animation; the per-page opt-in lives here.

### Forced colors

```css
@media (forced-colors: active) {
  :where(button, input, select, textarea) {
    forced-color-adjust: auto;
  }
  :where(:focus-visible) {
    outline-color: Highlight;
  }
}
```

System-color override mode (Windows High Contrast). Form controls revert to system rendering; brand-color focus rings would fail contrast in forced colors — the system `Highlight` color is guaranteed contrast-safe.

### React / Next.js framework guard

```css
:where(#root, #__next) {
  isolation: isolate;
}
```

Creates a new stacking context. Defensive against parent-app contexts when the theme renders inside a framework wrapper.

## A11y

The reset carries the theme's foundational accessibility chrome:

- **Focus**: `:focus-visible` shows the substrate ring; `:focus:not(:focus-visible)` suppresses mouse-click outlines without breaking keyboard focus
- **Touch targets**: 48px floor on interactive elements (anchors inside flow text excluded)
- **Reduced motion**: global override on animation / transition / scroll-behavior
- **Forced colors**: form controls + focus rings adapted to system colors

Per `a11y-conventions.md` § Existing patterns — reduced-motion + forced-colors handling is "already wired into `layer-reset.css`".

## Validation

Per `validation-contract.md` Tier 1a (substrate / utility-css).

- **Tier**: substrate — utility-css sub-shape
- **Page(s)**: every page exercises the reset (loaded via `utility--core-assets`); no dedicated validation page
- **API surface** (observable through any rendered page):
  - `body` carries `min-height: 100dvh` + the system-ui font stack as computed defaults
  - `:focus-visible` paints the substrate focus ring on tab navigation; mouse-click does not paint
  - Interactive elements (`button`, `<a>` outside flow text) meet 48px touch target
  - `[hidden]` elements have `display: none` regardless of component declarations
  - Reduced-motion media query (Chrome DevTools → Rendering → Emulate CSS) suppresses transitions
  - Forced-colors (Chrome DevTools → Rendering → Emulate forced-colors: active) reverts form controls to system rendering
- **Edge cases**:
  - Inline anchors with classes — touch-target override applies only to unclassed in-flow anchors per the `p a, li a, td a` rule; classed inline anchors size up to 48px which can break wrapping. Components author classed inline anchors mindful of layout impact.
  - `<dialog>` not currently shipped; reset defaults apply when sections start using native dialog
- **Visual showcase**: DevTools Computed Styles on any element + the substrate-reset validation page if added later
- **Assertions** (prose; Playwright once installed): `getComputedStyle(document.body).boxSizing === 'border-box'`; tab navigation paints a visible focus ring on focusable elements; reduced-motion emulation suppresses transitions
- **Unit scope**: none (CSS)

## Out of scope

- **Normalize-style typography defaults beyond the listed elements.** Browser defaults outside the listed list (`details`, `meter`, `progress`) retain UA styling; specialized sections style them when needed.
- **Scrollbar styling.** The reset does not touch `::-webkit-scrollbar` — left to native rendering or to component opt-ins.
- **Print stylesheet.** No `@media print` block; print styling is out of scope at the substrate.
- **Animation libraries / `@keyframes` defaults.** The reset suppresses motion under reduced-motion preference; component animations live in their respective stylesheets.

## Related

- `.context/specs/design-constants.md` — sources `--focus-ring-width`, `--focus-ring-offset`, and the cascade-layer declaration (`@layer base, reset, theme, utilities`)
- `.context/specs/color-scheme.md` — sources `--color-role-focus-ring`
- `.context/specs/layer-theme.md` — sibling substrate stylesheet (`@layer theme`); positionally beats `reset` in cascade order
- `.context/specs/utility--core-assets.md` — captures this file as part of stage-1 inline emission
- `.context/rules/a11y-conventions.md` — names the reset's role in `prefers-reduced-motion` + `forced-colors`
- `.context/docs/css-standards.md` — focus-style pattern + naming convention
