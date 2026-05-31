/**
 * Generic inner-layout custom element for container blocks.
 * @module @theme/token-layout
 * @version 1.1.0
 *
 * Changelog
 * - v1.1.0 — rename module + class + tag from `theme-layout` → `token-layout` (`ThemeLayout` → `TokenLayout`). File renamed `assets/theme-layout.js` → `assets/token-layout.js`. Per-project markup / CSS using the old tag or class must rename.
 * - v1.0.0 — initial (created during subgrid migration Stage 3)
 *
 * Anchors the inner wrapper of container blocks (`group`, `columns`) so consumers
 * can target `> token-layout` from the outer's CSS without a stylistic class. Empty
 * by design — exists to give the inner wrapper a custom-element tag, replacing
 * `<div class="inner">`. Future enhancements can extend the class without touching
 * markup. Per `.context/docs/subgrid-migration.md` § Stage 3.
 */

/**
 * Generic inner-layout element. No methods; registered as `<token-layout>`.
 */
export class TokenLayout extends HTMLElement {}

window.customElements.define("token-layout", TokenLayout);
