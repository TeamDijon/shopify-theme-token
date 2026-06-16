/**
 * Theme library — entry point.
 * Imports all modules, re-exports them for consumers, and populates the
 * `window.Token` namespace for use in inline scripts and Liquid templates.
 *
 * @module @theme/core
 * @version 1.3.0
 *
 * Changelog
 * - v1.3.0 — rename global namespace `window.theme` → `window.Token` for collision safety. The generic `window.theme` risked colliding with merchant custom code, third-party widgets, or other themes' shared scripts when the codebase is ported. Per-project inline scripts and Liquid templates referencing `window.theme.<x>` must rename to `window.Token.<x>`.
 * - v1.2.0 — re-export `TokenLayout` from @theme/token-layout (registers the `<token-layout>` custom element used as the inner wrapper of container blocks; per subgrid migration Stage 3)
 * - v1.1.0 — extract document-level singletons (documentModifiers, documentScroll, documentScrollbar) into @theme/document-utils so this file stays focused on entry-point + namespace duties
 * - v1.0.0 — initial
 */

// Utilities
export { getRootFontSize, throttle, debounce } from '@theme/utils';

// DOM
export { dom } from '@theme/dom';

// Document-level singletons
export { documentModifiers, documentScroll, documentScrollbar } from '@theme/document-utils';

// Managers
export { EventsManager } from '@theme/events-manager';
export { ObserversManager } from '@theme/observers-manager';
export { CacheManager } from '@theme/cache-manager';
export { ModifiersManager } from '@theme/modifiers-manager';

// Components
export { BaseComponent } from '@theme/base-component';
export { TokenLayout } from '@theme/token-layout';

// ---- window.Token namespace (theme-scoped globals for inline scripts + Liquid) ----

import { getRootFontSize, throttle, debounce } from '@theme/utils';
import { dom } from '@theme/dom';
import { documentModifiers, documentScroll, documentScrollbar } from '@theme/document-utils';
import { EventsManager } from '@theme/events-manager';
import { ObserversManager } from '@theme/observers-manager';
import { CacheManager } from '@theme/cache-manager';
import { ModifiersManager } from '@theme/modifiers-manager';
import { BaseComponent } from '@theme/base-component';
import { TokenLayout } from '@theme/token-layout';

window.Token = window.Token || {};

window.Token.utils = window.Token.utils || {};
window.Token.utils.getRootFontSize = getRootFontSize;
window.Token.utils.throttle = throttle;
window.Token.utils.debounce = debounce;
window.Token.utils.documentModifiers = documentModifiers;
window.Token.utils.documentScroll = documentScroll;
window.Token.utils.documentScrollbar = documentScrollbar;

window.Token.dom = dom;

window.Token.managers = window.Token.managers || {};
window.Token.managers.EventsManager = EventsManager;
window.Token.managers.ObserversManager = ObserversManager;
window.Token.managers.CacheManager = CacheManager;
window.Token.managers.ModifiersManager = ModifiersManager;

window.Token.components = window.Token.components || {};
window.Token.components.BaseComponent = BaseComponent;
window.Token.components.TokenLayout = TokenLayout;

// ---- Initialization ----

/**
 * Initializes the theme library and dispatches a custom "theme:ready" event.
 *
 * @fires theme:ready - Custom event dispatched when the library is initialized.
 */
window.Token.init = () => {
  window.dispatchEvent(new CustomEvent('theme:ready'));
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.Token.init);
} else {
  window.Token.init();
}
