/**
 * Generic inner-layout custom element for container blocks.
 * @module @theme/theme-layout
 * @version 1.0.0
 *
 * Anchors the inner wrapper of container blocks (`group`, `columns`) so consumers
 * can target `> theme-layout` from the outer's CSS without a stylistic class. Empty
 * by design — exists to give the inner wrapper a custom-element tag, replacing
 * `<div class="inner">`. Future enhancements can extend the class without touching
 * markup. Per `.context/docs/subgrid-migration.md` § Stage 3.
 */

/**
 * Generic inner-layout element. No methods; registered as `<theme-layout>`.
 */
export class ThemeLayout extends HTMLElement {}

window.customElements.define("theme-layout", ThemeLayout);
