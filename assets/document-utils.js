/**
 * Document-element singletons — modifiers, scroll-lock, scrollbar width tracking.
 * @module @theme/document-utils
 * @version 1.0.0
 */

import { ModifiersManager } from "@theme/modifiers-manager";

/**
 * Singleton ModifiersManager bound to document.documentElement. Components manipulating html-level state (locked-scroll, theme switches, locale flags) read and mutate through this.
 */
export const documentModifiers = new ModifiersManager(document.documentElement);

/**
 * Document scroll-lock helper. Locks the page scroll while a modal/drawer is open by freezing scrollY into `inset-block-start` and adding the `locked-scroll` modifier on documentElement.
 *
 * @property {boolean} isLocked - Getter/setter for the lock state.
 */
export const documentScroll = {
  get isLocked() {
    return documentModifiers.has("locked-scroll");
  },

  set isLocked(value) {
    if (value) {
      document.documentElement.style.scrollBehavior = "auto";
      document.documentElement.style.insetBlockStart = `-${window.scrollY}px`;

      documentModifiers.add("locked-scroll");
    } else {
      documentModifiers.remove("locked-scroll");

      window.scrollTo(
        0,
        -1 * parseInt(document.documentElement.style.insetBlockStart),
      );
      document.documentElement.style.insetBlockStart = null;
      document.documentElement.style.scrollBehavior = null;
    }
  },
};

/**
 * Scrollbar width tracking — measures the browser scrollbar gutter and emits `--scrollbar-width` as a CSS custom property on documentElement. ResizeObserver instance is lazy.
 */
export const documentScrollbar = (() => {
  let widthObserver = null;

  return {
    get width() {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      return Math.max(scrollbarWidth, 0);
    },

    updateWidth() {
      document.documentElement.style.setProperty(
        "--scrollbar-width",
        `${this.width}px`,
      );
    },

    observeWidth() {
      if (!widthObserver) {
        widthObserver = new ResizeObserver(() => {
          this.updateWidth();
        });
        widthObserver.observe(document.documentElement);
      }
      return widthObserver;
    },

    disconnectObserver() {
      if (widthObserver) {
        widthObserver.disconnect();
        widthObserver = null;
      }
    },
  };
})();
