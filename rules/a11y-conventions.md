---
paths:
  - "**/*.liquid"
---

# Accessibility conventions

Theme-wide a11y patterns. Per-component patterns (forms, modals, tabs, accordions, dropdowns, carousels, etc.) reference Horizon's per-component rules — see "When authoring an interactive component" below.

## Principles

1. **Semantic HTML first.** `<button>` not `<div onclick>`, `<details>/<summary>` not custom toggles, `<dialog>` not custom modals, `<nav>` not `<div role="navigation">`. Native elements are accessible by default. See `.context/docs/html-standards.md` for the full native-first pattern list.
2. **Never break visible focus.** `:focus-visible` for outlines; never `outline: none` without a replacement. See `.context/docs/css-standards.md` for the focus-style patterns we use.
3. **Alt text or hidden.** Every `<img>` and informative `<svg>` has `alt`/`aria-label`/`<title>+<desc>`. Decorative SVG: `aria-hidden="true"`.
4. **Labels for inputs.** Every form control needs an associated `<label>` or `aria-label`. `placeholder` is a hint, not a label.
5. **Announce dynamic changes.** Content that updates without page reload (cart, filter, gallery) needs `aria-live="polite"` (status) or `"assertive"` (alerts). Use `role="status"` for general updates, `role="alert"` for errors.
6. **Test with keyboard alone.** Tab/Shift+Tab navigates, Enter/Space activates, Escape dismisses. Custom interactive components must support this. Focus trap inside modals.
7. **Honor user preferences.** `@media (prefers-reduced-motion: reduce)` and `@media (forced-colors: active)` are already wired into `core.css` `@layer reset`; per-component CSS should respect them.

## Color contrast

WCAG AA: 4.5:1 for normal text, 3:1 for large text and UI components (borders, focus indicators). Use named theme color tokens (`var(--color-<name>)` from `theme_color` metaobjects) — never hardcoded hex pairings that could fail contrast at runtime.

## Touch targets

Interactive elements: 44×44px minimum (iOS guideline). Use `min-block-size`/`min-inline-size`, not `padding`, so the target stays large even with small content.

## SR-only text

Strings live under `accessibility.*` in locale files (see `.context/docs/locale-conventions.md`). Render via `| t`; visually hide with a `.visually-hidden` CSS utility (add to `core.css` when first needed: `position: absolute; clip: rect(0,0,0,0); inline-size: 1px; block-size: 1px; overflow: hidden;`).

## Existing patterns in the theme

- **Skip-to-content link** — `snippets/skip-to-content.liquid`, rendered from `layout/theme.liquid`
- **Reduced-motion + forced-colors handling** — `assets/core.css` `@layer reset`
- **`:focus-visible` outlines** — theme-level rules; per-component CSS inherits

## When authoring an interactive component

Reference Horizon's per-component rules for ARIA roles, keyboard interactions, and focus management. Path: `C:\Users\troph\Downloads\horizon-main\horizon-main\.cursor\rules\<component>-accessibility.mdc` (e.g., `modal-accessibility.mdc`, `tab-accessibility.mdc`, `form-accessibility.mdc`). Each is 100-700 lines deep — distill the relevant patterns into the component's snippet doc block or `{% stylesheet %}` comments rather than copying wholesale.
