/**
 * Theme library — entry point.
 * Imports all modules, re-exports them for consumers, and populates the
 * `window.theme` namespace for use in inline scripts and Liquid templates.
 *
 * @module @theme/core
 * @version 1.0.0
 */

// Utilities
export { getRootFontSize, throttle, debounce } from "@theme/utils";

// DOM
export { dom } from "@theme/dom";

// Managers
export { EventsManager } from "@theme/events-manager";
export { ObserversManager } from "@theme/observers-manager";
export { CacheManager } from "@theme/cache-manager";
export { ModifiersManager } from "@theme/modifiers-manager";

// Components
export { BaseComponent } from "@theme/base-component";

// ---- window.theme namespace (backward compat) ----

import { getRootFontSize, throttle, debounce } from "@theme/utils";
import { dom } from "@theme/dom";
import { EventsManager } from "@theme/events-manager";
import { ObserversManager } from "@theme/observers-manager";
import { CacheManager } from "@theme/cache-manager";
import { ModifiersManager } from "@theme/modifiers-manager";
import { BaseComponent } from "@theme/base-component";

window.theme = window.theme || {};

window.theme.utils = window.theme.utils || {};
window.theme.utils.getRootFontSize = getRootFontSize;
window.theme.utils.throttle = throttle;
window.theme.utils.debounce = debounce;

window.theme.dom = dom;

window.theme.managers = window.theme.managers || {};
window.theme.managers.EventsManager = EventsManager;
window.theme.managers.ObserversManager = ObserversManager;
window.theme.managers.CacheManager = CacheManager;
window.theme.managers.ModifiersManager = ModifiersManager;

window.theme.components = window.theme.components || {};
window.theme.components.BaseComponent = BaseComponent;

// ---- Document-level singletons ----

/**
 * A singleton ModifiersManager for document.documentElement.
 */
(() => {
  let _documentModifiers = null;
  Object.defineProperty(window.theme.utils, "documentModifiers", {
    get: () => {
      if (!_documentModifiers) {
        _documentModifiers = new ModifiersManager(document.documentElement);
      }

      return _documentModifiers;
    },
  });
})();

/**
 * Namespace for managing scroll-related functionality for document.documentElement.
 * @property {boolean} isLocked - Getter and setter for the `locked-scroll` modifier.
 */
window.theme.utils.documentScroll = {
  get isLocked() {
    return window.theme.utils.documentModifiers.has("locked-scroll");
  },

  set isLocked(value) {
    if (value) {
      document.documentElement.style.scrollBehavior = "auto";
      document.documentElement.style.insetBlockStart = `-${window.scrollY}px`;

      window.theme.utils.documentModifiers.add("locked-scroll");
    } else {
      window.theme.utils.documentModifiers.remove("locked-scroll");

      window.scrollTo(
        0,
        -1 * parseInt(document.documentElement.style.insetBlockStart)
      );
      document.documentElement.style.insetBlockStart = null;
      document.documentElement.style.scrollBehavior = null;
    }
  },
};

/**
 * Namespace for managing the scrollbar width and related functionality on document.documentElement.
 */
window.theme.utils.documentScrollbar = (() => {
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
        `${this.width}px`
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

// ---- Initialization ----

/**
 * Initializes the theme library and dispatches a custom "theme:ready" event.
 *
 * @fires theme:ready - Custom event dispatched when the library is initialized.
 */
window.theme.init = () => {
  window.dispatchEvent(new CustomEvent("theme:ready"));
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", window.theme.init);
} else {
  window.theme.init();
}
