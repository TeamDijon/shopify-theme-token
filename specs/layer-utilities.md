# layer-utilities

**Layer**: substrate

**Type**: utility-css (`assets/layer-utilities.css`)

**Status**: shipped

**Implementation**:
- `assets/layer-utilities.css` `@layer utilities` — substrate utility classes + selectors wrapping every rule under the highest-position cascade layer; pinned by description per `spec-convention.md` § Substrate stylesheets

**Reconciled**: 2026-06-05

**Reviewed**: 2026-06-05

**Depends on**:
- `var(--layer-temporary)` (z-index scale entry from `design-constants.md`) — consumed by the `.skip-to-content:focus-within` rule
- `var(--duration-slow)`, `var(--ease-standard)` (motion scales from `design-constants.md`) — consumed by the `<details>` animation block

**Consumers**:
- `snippets/utility--core-assets.liquid` — captures this file via `utility--inline-asset` and concatenates it into the head's first `<style>` block as the fourth `layer-*.css` (after `layer-base.css`, `layer-reset.css`, `layer-theme.css`)
- `snippets/skip-to-content.liquid` — uses the `.skip-to-content` class
- `snippets/icon.liquid` — every rendered icon uses the `svg[data-name]` selector chain (fill/stroke/preset variants)
- Any element bearing `data-modifiers*="prose"` — typically the `richtext` block (`prose` is its always-on modifier)
- Any element bearing `data-modifiers*="locked-scroll"` on `<html>` — the `documentScroll` lock pattern (see `document-utils.md`)
- Components using `.sr-only` for visually-hidden SR-only text

## Purpose

The substrate-level utility-class layer. Five rule groups wrapped in `@layer utilities` — the cascade's highest-position layer, beating `base`, `reset`, and `theme` in resolution. Houses cross-cutting utility behavior that would otherwise be duplicated across components: prose rhythm, scroll lock, screen-reader-only positioning, the icon-system selector chain, and the `<details>` open-close animation opt-in.

The cascade-layer position is the design point: utilities sit above theme rules so a class / modifier opt-in (`.sr-only`, `data-modifiers*="prose"`) always wins against component CSS. Components don't need to fight cascade for a utility to take effect.

## Pinning

Substrate stylesheets pin by description per `spec-convention.md` § Substrate stylesheets — versioning the file as a whole would force every consumer to reconcile on every edit. Structural anchor is the `@layer utilities` block; freshness is the `Reconciled` date.

## Rule groups

### 1. Prose modifier — `[data-modifiers*="prose"]`

Rich-content spacing utility. Targets any element bearing the `prose` modifier; the `richtext` block opts in unconditionally, specialized sections (`<token-cart>`, `<token-header>`, `<theme-overlay>`) and non-section contexts opt in by adding the modifier.

| Selector | Rule | Purpose |
|---|---|---|
| `& > *:not(style)` | `margin-block: 1rem` | Default rhythm between direct children |
| `& :is(h1, .h1, .h0)` | `margin-block: 2rem` | Larger gap around top-level headings |
| `& :is(h2, .h2, h3, .h3)` | `margin-block-start: 1.5rem` | Top gap before mid-tier headings (no bottom — runs into next paragraph) |
| `& :is(ul, ol)` | `margin-inline-start: 0.75rem; padding-inline-start: 0.75rem` | List indentation |
| `& li` | `margin-block: 0.5rem 0.5rem; text-align: left` | Per-list-item rhythm; left-align prevents inherited centering |
| `& li :is(ul, ol)` | `margin-block: 0rem` | Nested lists drop the outer 1rem rhythm |
| `& hr + *` | `margin-block-start: 0rem` | Element following an `<hr>` gets no top margin (hr already separates) |
| `& > :first-child` | `margin-block-start: 0rem` | First child of the prose container has no top margin |
| `& > :last-child:not(style), & > :has(+ style:last-child)` | `margin-block-end: 0rem` | Last child has no bottom margin; the `:has()` variant handles the case where the last child is followed by a `<style>` block (Liquid's `{% stylesheet %}` output) |

`:not(style)` everywhere defends against Liquid-emitted `<style>` blocks appearing as children and disturbing the rhythm.

### 2. Skip-to-content link — `.skip-to-content`

```css
.skip-to-content { /* visually-hidden by default */ }
.skip-to-content:focus-within { /* revealed on focus */ }
```

Default state is screen-reader-only (1px positioned-off-screen, clipped). On focus-within, repositions to top-left at 0.75rem inset, paints with white background + black border + `--layer-temporary` z-index, becomes visible-and-interactive.

The default-state styling is structurally similar to `.sr-only` (rule group 4); the divergence is the `:focus-within` reveal block.

### 3. Scroll-lock — `html`

```css
html {
  overflow-y: scroll;
  scrollbar-gutter: stable;
}

html[data-modifiers*="locked-scroll"] {
  position: fixed;
  inline-size: 100%;
}
```

Always-on: `overflow-y: scroll` reserves the scrollbar gutter even when no scroll is needed, preventing layout shift between short and long pages. `scrollbar-gutter: stable` is the modern equivalent (supported browsers honor it; legacy browsers fall back to the `overflow-y: scroll` reserve).

When `<html data-modifiers*="locked-scroll">` is active (the JS-side `documentScroll.lock()` from `document-utils.js`), the document position-fixes to suppress scroll without losing inline-size. Coordinated with JS-side `top: -<scrollY>px` mutation per `document-utils.md` § documentScroll.

### 4. Screen-reader only — `.sr-only`

```css
.sr-only {
  position: absolute;
  inline-size: 0.0625rem; /* 1px */
  block-size: 0.0625rem;
  padding: 0;
  margin: -0.0625rem;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

Visually-hidden but SR-accessible. Per `a11y-conventions.md` § SR-only text — strings live under `accessibility.*` in locale files; this is the matching CSS utility.

### 5. SVG icon-system selector — `svg[data-name]`

The icon-system's CSS contract — scoped to `svg[data-name]` so non-icon SVGs aren't affected.

| Branch | Rules |
|---|---|
| Base | `fill: none; stroke: currentcolor; stroke-width: 0.25rem` (4px equivalent) |
| `[data-modifiers*="fill"]` | `fill: currentcolor; stroke: none; scale: 1` |
| `[data-modifiers*="round"]` | `stroke-linecap: round; stroke-linejoin: round` |
| `path[data-edge]` | `transform-origin: center; scale: 0.92` (inset edge-hugging strokes) |

Per-icon preset blocks:

**`[data-name="arrow"]`** — source SVG points top-right (corner-to-corner diagonal). The four cardinal presets rotate from there; the diagonal then lands on a viewBox axis and the tip overshoots the box by sqrt(2). Scale back by 1/sqrt(2) (`0.7071`) on the orthogonal presets to keep the arrow in bounds:

| Preset | Rules |
|---|---|
| `up` / `right` / `down` / `left` | `scale: 0.7071` |
| `up` | `transform: rotate(-45deg)` |
| `right` | `transform: rotate(45deg)` |
| `down` | `transform: rotate(135deg)` |
| `left` | `transform: rotate(-135deg)` |

**`[data-name="chevron"]`** — source SVG points right:

| Preset | Rules |
|---|---|
| `left` | `transform: rotate(180deg)` |
| `up` | `transform: rotate(-90deg)` |
| `down` | `transform: rotate(90deg)` |

**`[data-name="star"]`** — coordinates with star-rating's full/half/empty rendering:

| Preset | Rules |
|---|---|
| `full` | `fill: currentcolor` |
| `half path[data-half-star]` | `fill: currentcolor` (only the half-star path fills) |
| `empty path[data-half-star]` | `display: none` (drops the half-star path) |
| `empty` | `fill: none` (parent outline only) |

### 6. `<details>` animation

```css
@media (prefers-reduced-motion: no-preference) {
  details {
    transition: var(--duration-slow) var(--ease-standard);

    @supports (interpolate-size: allow-keywords) {
      interpolate-size: allow-keywords;

      &::details-content {
        block-size: 0;
        opacity: 0;
        transition: var(--duration-slow) var(--ease-standard) allow-discrete;
        overflow-y: hidden;
      }
      &[open]::details-content {
        block-size: auto;
        opacity: 1;
      }
    }
  }
}
```

Open / close animation for native `<details>` using the new `::details-content` pseudo-element + `interpolate-size: allow-keywords` opt-in (declared on `html` in `layer-reset.css`). The `allow-discrete` transition behavior animates discrete properties (like `display`) during the transition.

Gated on `prefers-reduced-motion: no-preference` and `@supports (interpolate-size: allow-keywords)` — both gates are required; the animation degrades to instant open / close in either failure case.

## A11y

- **`.sr-only`** is the SR-only utility per `a11y-conventions.md` § SR-only text
- **`.skip-to-content`** carries the skip-to-content interaction pattern (visible on focus only, revealed for keyboard users)
- **`<details>` animation respects `prefers-reduced-motion`** — the entire animation block is wrapped in `@media (prefers-reduced-motion: no-preference)`

## Validation

Per `validation-contract.md` Tier 1a (substrate / utility-css).

- **Tier**: substrate — utility-css sub-shape
- **Page(s)**: every page exercises the utilities (loaded via `utility--core-assets`); the icon system is observable on every page rendering an icon
- **API surface** (matrix to exercise):
  - `[data-modifiers*="prose"]` container → direct children get 1rem block margins; first / last children get 0
  - `.skip-to-content` link in `<body>` first position → not visible until tabbed-to; focused state shows the visible link
  - `<html data-modifiers*="locked-scroll">` (JS-set) → scroll suppressed; no horizontal layout shift
  - `.sr-only` element → not visible, SR reads contents
  - `svg[data-name="arrow"][data-preset="up"]` → rendered visually as an upward arrow within bounds (scale 0.7071)
  - `<details>` open / close transition → animates smoothly under no-reduced-motion preference; instant under reduced-motion
- **Edge cases**:
  - `<details>` inside `prose` — the details-content animation block is scoped to all details elements globally; the prose rhythm rules apply on the wrapping element. The two coordinate well.
  - Nested prose containers — the rhythm cascade is intentionally not recursive; nested `data-modifiers*="prose"` re-applies the rules but inner-most wins on margin specifics
  - Star icon with `[data-preset="empty"]` and no `path[data-half-star]` — the `path[data-half-star]` selector matches nothing; the `[data-preset="empty"] { fill: none }` rule still applies and renders as outline-only
- **Visual showcase**: rendering `validation--substrate--icon` exercises the icon system; rendering `validation--primitive--richtext` exercises the prose modifier
- **Assertions** (prose; Playwright once installed):
  - `[data-modifiers*="prose"] > :first-child` has computed `margin-block-start: 0`
  - `.skip-to-content` has computed `position: absolute; clip: rect(0, 0, 0, 0)` by default
  - `svg[data-name]` carries `stroke: currentcolor` (or `fill: currentcolor` on `[data-modifiers*="fill"]`)
  - `<details>` transition fires on toggle under no-reduced-motion; doesn't fire under reduced-motion emulation
- **Unit scope**: none (CSS)

## Out of scope

- **Tailwind / Atomic-CSS-style utility set.** Five focused rule groups, not an atomic-class catalog. Components compose via their own stylesheets, not utility-class stacking.
- **Per-icon variant beyond the three named families.** `arrow`, `chevron`, `star` cover the current need. New icon variants extend this file when their CSS rules are added.
- **Per-element prose rhythm overrides.** Components inside prose containers can override via own CSS — the `@layer utilities` position makes overriding a specificity question, not a cascade-layer one.
- **JS-side scroll lock implementation.** The CSS rule reacts to `data-modifiers*="locked-scroll"`; the JS attaching / detaching the modifier lives in `document-utils.js` (`documentScroll`).
- **Animation curves for `<details>`.** Duration + easing come from the design-constants motion scale; per-element overrides aren't surfaced.

## Related

- `.context/specs/design-constants.md` — sources `--layer-temporary`, `--duration-slow`, `--ease-standard`
- `.context/specs/layer-reset.md` — sibling substrate stylesheet; the `interpolate-size: allow-keywords` opt-in on `html` lives there
- `.context/specs/skip-to-content.md` — the snippet using `.skip-to-content`
- `.context/specs/icon.md` — uses the `svg[data-name]` selector chain
- `.context/specs/richtext.md` — primary consumer of the prose modifier
- `.context/specs/document-utils.md` — JS-side counterpart to scroll-lock + sr-only patterns
- `.context/rules/a11y-conventions.md` — `.sr-only` + skip-to-content references
- `.context/rules/icon-convention.md` — per-icon SVG authoring rules
- `.context/specs/utility--core-assets.md` — captures this file as part of stage-1 inline emission
