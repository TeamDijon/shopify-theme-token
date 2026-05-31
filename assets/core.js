/**
 * Theme library — entry point.
 * Imports all modules, re-exports them for consumers, and populates the
 * `window.theme` namespace for use in inline scripts and Liquid templates.
 *
 * @module @theme/core
 * @version 1.2.0
 *
 * Changelog
 * - v1.2.0 — re-export `ThemeLayout` from @theme/theme-layout (registers the `<theme-layout>` custom element used as the inner wrapper of container blocks; per subgrid migration Stage 3)
 * - v1.1.0 — extract document-level singletons (documentModifiers, documentScroll, documentScrollbar) into @theme/document-utils so this file stays focused on entry-point + namespace duties
 * - v1.0.0 — initial
 */

// Utilities
export { getRootFontSize, throttle, debounce } from "@theme/utils";

// DOM
export { dom } from "@theme/dom";

// Document-level singletons
export { documentModifiers, documentScroll, documentScrollbar } from "@theme/document-utils";

// Managers
export { EventsManager } from "@theme/events-manager";
export { ObserversManager } from "@theme/observers-manager";
export { CacheManager } from "@theme/cache-manager";
export { ModifiersManager } from "@theme/modifiers-manager";

// Components
export { BaseComponent } from "@theme/base-component";
export { ThemeLayout } from "@theme/theme-layout";

// ---- window.theme namespace (backward compat) ----

import { getRootFontSize, throttle, debounce } from "@theme/utils";
import { dom } from "@theme/dom";
import { documentModifiers, documentScroll, documentScrollbar } from "@theme/document-utils";
import { EventsManager } from "@theme/events-manager";
import { ObserversManager } from "@theme/observers-manager";
import { CacheManager } from "@theme/cache-manager";
import { ModifiersManager } from "@theme/modifiers-manager";
import { BaseComponent } from "@theme/base-component";
import { ThemeLayout } from "@theme/theme-layout";

window.theme = window.theme || {};

window.theme.utils = window.theme.utils || {};
window.theme.utils.getRootFontSize = getRootFontSize;
window.theme.utils.throttle = throttle;
window.theme.utils.debounce = debounce;
window.theme.utils.documentModifiers = documentModifiers;
window.theme.utils.documentScroll = documentScroll;
window.theme.utils.documentScrollbar = documentScrollbar;

window.theme.dom = dom;

window.theme.managers = window.theme.managers || {};
window.theme.managers.EventsManager = EventsManager;
window.theme.managers.ObserversManager = ObserversManager;
window.theme.managers.CacheManager = CacheManager;
window.theme.managers.ModifiersManager = ModifiersManager;

window.theme.components = window.theme.components || {};
window.theme.components.BaseComponent = BaseComponent;
window.theme.components.ThemeLayout = ThemeLayout;

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
