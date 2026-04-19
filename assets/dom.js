/**
 * Lazy getters for common DOM elements.
 * @module @theme/dom
 * @version 1.0.0
 */

export const dom = {
  get pageContent() {
    const element = document.getElementById("page_content");
    if (!element) {
      console.warn("Element with ID 'page_content' not found.");
    }

    return element;
  },
  get header() {
    const element = document.getElementById("header");
    if (!element) {
      console.warn("Element with ID 'header' not found.");
    }

    return element;
  },
  get footer() {
    const element = document.getElementById("footer");
    if (!element) {
      console.warn("Element with ID 'footer' not found.");
    }

    return element;
  },
  get miniCart() {
    const element = document.getElementById("mini_cart");
    if (!element) {
      console.warn("Element with ID 'mini_cart' not found.");
    }

    return element;
  },
  get cart() {
    const element = document.getElementById("cart_drawer");
    if (!element) {
      console.warn("Element with ID 'cart_drawer' not found.");
    }

    return element;
  },
  get miniSearch() {
    const element = document.getElementById("mini_search");
    if (!element) {
      console.warn("Element with ID 'mini_search' not found.");
    }

    return element;
  },
  get search() {
    const element = document.getElementById("search");
    if (!element) {
      console.warn("Element with ID 'search' not found.");
    }

    return element;
  },
};
