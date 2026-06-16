/**
 * Lazy getters for common DOM elements.
 * @module @theme/dom
 * @version 2.0.0
 *
 * Changelog
 * - v2.0.0 — trim to `pageContent` only. The previously-exported `header`, `footer`, `miniCart`, `cart`, `miniSearch`, `search` getters referenced unshipped sections — accessing them produced `null` + console warnings. Re-add each when the corresponding section lands, with the actual id confirmed.
 * - v1.0.0 — initial
 */

export const dom = {
  get pageContent() {
    const element = document.getElementById('page_content');
    if (!element) {
      console.warn("Element with ID 'page_content' not found.");
    }

    return element;
  },
};
