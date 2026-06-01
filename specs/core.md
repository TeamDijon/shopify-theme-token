# core

**Layer**: substrate

**Type**: utility-js (`assets/core.js`)

**Status**: shipped

**Implementation**: `assets/core.js` v1.3.0 (entry point — imports, re-exports, `window.Token` namespace, initialization)

**Reconciled**: 2026-06-01

**Reviewed**: pending

**Depends on**: every other `@theme/*` JS module. Imports them all, re-exports them, and copies references onto `window.Token`. Specifically: `@theme/utils`, `@theme/dom`, `@theme/document-utils`, `@theme/events-manager`, `@theme/observers-manager`, `@theme/cache-manager`, `@theme/modifiers-manager`, `@theme/base-component`, `@theme/token-layout`.

**Consumers**:
- The browser's module loader — `core.js` is the entry point loaded via the import-map in `snippets/utility--import-map.liquid`. Loading `core` triggers the import chain pulling in every dependent module.
- Inline scripts and Liquid templates — access exports via `window.Token.<namespace>.<name>` (e.g., `window.Token.managers.EventsManager`, `window.Token.utils.throttle`).
- ES-module consumers — can import re-exports via `@theme/core` (e.g., `import { BaseComponent } from "@theme/core"`); however, the canonical path is the per-module specifier (`@theme/base-component`), since `core.js` re-exports are convenience aggregations.

## Purpose

The theme's JS entry point. Three concerns rolled into one file:

1. **Module orchestration.** Imports every `@theme/*` module so loading `core.js` brings in the whole library. The import-map utility (`snippets/utility--import-map.liquid`) wires the module specifiers to cache-busted asset URLs; `core.js`'s import statements are how the chain enters.
2. **Re-exports.** Every imported symbol is re-exported, so `@theme/core` is an alternative entry for ES-module consumers wanting a single import path. Consumers using the per-module specifier (`@theme/base-component`) bypass this layer.
3. **`window.Token` namespace setup.** Copies imports onto `window.Token` for inline scripts and Liquid templates that can't use ES module imports. The namespace is grouped: `window.Token.utils.*`, `window.Token.dom`, `window.Token.managers.*`, `window.Token.components.*`. Plus `window.Token.init()` — a one-shot initialization hook firing a `theme:ready` event for late-binding consumers.

The file was previously named "overloaded" in the Cluster 5 audit (per FOUNDATIONAL-AUDIT.md → BACKLOG residue) — entry-point + namespace + document-level singletons. v1.1.0 extracted the document-level singletons (`documentModifiers`, `documentScroll`, `documentScrollbar`) into `@theme/document-utils`. Today `core.js` is focused: entry point + namespace + init.

## API

### Re-exports

Every import is re-exported. Consumers can:

```js
import { BaseComponent, EventsManager, throttle } from "@theme/core";
```

Equivalent (and canonical) form using per-module specifiers:

```js
import { BaseComponent } from "@theme/base-component";
import { EventsManager } from "@theme/events-manager";
import { throttle } from "@theme/utils";
```

Full re-export list:

| Source module | Re-exports |
|---|---|
| `@theme/utils` | `getRootFontSize`, `throttle`, `debounce` |
| `@theme/dom` | `dom` |
| `@theme/document-utils` | `documentModifiers`, `documentScroll`, `documentScrollbar` |
| `@theme/events-manager` | `EventsManager` |
| `@theme/observers-manager` | `ObserversManager` |
| `@theme/cache-manager` | `CacheManager` |
| `@theme/modifiers-manager` | `ModifiersManager` |
| `@theme/base-component` | `BaseComponent` |
| `@theme/token-layout` | `TokenLayout` |

### `window.Token` namespace

After `core.js` loads, the following window-level surface exists:

```js
window.Token = {
  utils: {
    getRootFontSize,
    throttle,
    debounce,
    documentModifiers,
    documentScroll,
    documentScrollbar,
  },
  dom,
  managers: {
    EventsManager,
    ObserversManager,
    CacheManager,
    ModifiersManager,
  },
  components: {
    BaseComponent,
    TokenLayout,
  },
  init: () => void,
};
```

The grouping (`utils` / `dom` / `managers` / `components`) is a convenience taxonomy — utility functions + DOM catalogs + manager classes + custom-element components. Inline scripts compose against the namespace without managing imports.

### `window.Token.init()`

```js
window.Token.init = () => {
  window.dispatchEvent(new CustomEvent("theme:ready"));
};
```

Fires a `theme:ready` custom event on `window`. Called automatically on `DOMContentLoaded` (or synchronously if the document is already past loading). Late-binding consumers can `addEventListener('theme:ready', handler)` to defer setup until after the theme library is initialized.

Currently no production consumer exists for `theme:ready` — the event is a forward-looking hook reserved for future use (specialized sections that need to wait for theme initialization before binding).

## Output shape

N/A — JS module, no DOM emission. The visible effect is the `window.Token` namespace and the `theme:ready` event firing.

## CSS

N/A — JS module.

## CSS custom properties (exposed)

N/A — JS module.

## Behavior

- **Entry-point loaded via import-map.** `snippets/utility--import-map.liquid` wires `@theme/core` to `assets/core.js` (with cache-busting); the layout's `<script type="module" src="...core.js">` triggers the load. Loading `core` cascades the imports: every dependent module loads on first reference.
- **Re-exports are aggregations, not modifications.** The exports are the same identifiers as the source modules — no proxies, no wrappers. Consumers using `import { x } from "@theme/core"` get the exact same reference as `import { x } from "@theme/<module>"`.
- **`window.Token` is the global namespace.** Renamed from `window.theme` in v1.3.0 for collision safety — generic `theme` risked clashing with merchant code, third-party widgets, or other themes' globals when the codebase is ported.
- **Grouped namespace structure.** `utils` (pure functions + document singletons) / `dom` (DOM catalog) / `managers` (per-element classes) / `components` (custom-element classes). The grouping is convention; flat would also work but reading `window.Token.managers.EventsManager` makes the role clearer than `window.Token.EventsManager`.
- **`window.Token = window.Token || {}` initializer.** Idempotent — re-loading `core.js` (which shouldn't happen but isn't impossible in dev hot-reload contexts) doesn't clobber existing references. Sub-namespaces (`utils`, `managers`, `components`) follow the same `= window.Token.x || {}` pattern.
- **`init` is auto-run.** The script checks `document.readyState` — if still loading, attaches a `DOMContentLoaded` listener; if past loading (script loaded async after the event), calls `init()` synchronously. Either way, `theme:ready` fires once per page load.
- **`theme:ready` is currently a forward-looking hook.** No production consumer today. The event provides a coordinated late-binding point for future specialized sections that need to wait for the theme library to be ready.
- **No teardown.** The namespace lives for the page session. No `destroy()` or unload hook — page unload destroys the namespace naturally.
- **Component registration as side effect.** Importing `@theme/base-component` triggers its `customElements.define('token-section', BaseComponent)` call at module load. Same for `@theme/token-layout` registering `<token-layout>`. So `core.js` loading also registers the shipped custom elements via the import chain.

## Locale keys

N/A — pure infrastructure JS, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1d (substrate / utility-js).

- **Tier**: substrate — utility-js sub-shape
- **Harness**: none today. Future state runs Vitest under `tests/unit/core.test.js`, importing the module and asserting against the post-load window state.
- **Unit scope** (prose; Vitest specs once installed):
  - **Re-export integrity**: every symbol exported from a per-module specifier is also exported from `@theme/core`; references are identical (`===`).
  - **Namespace shape**: after import, `window.Token` exists with `utils`, `dom`, `managers`, `components` sub-namespaces populated per the documented list.
  - **`window.Token.init` fires `theme:ready`**: listener attached before init firing receives the event; listener attached after also receives subsequent firings (the function can be called manually too).
  - **DOMContentLoaded path**: with `document.readyState === 'loading'`, init attaches a listener; firing `DOMContentLoaded` triggers init.
  - **Sync path**: with `document.readyState !== 'loading'`, init is called synchronously at module load.
  - **Custom-element registration side-effect**: after import, `customElements.get('token-section')` returns `BaseComponent`; `customElements.get('token-layout')` returns `TokenLayout`.
  - **Idempotent re-import**: importing `@theme/core` twice (e.g., in a test environment) doesn't crash; the second import is a no-op (modules are cached by spec; `window.Token` accumulators tolerate re-execution).
- **Edge cases**:
  - Loading `core.js` in an environment without `window` (Worker, Node SSR) — namespace setup throws. The theme runtime is browser-only.
  - Loading `core.js` before the import-map snippet — `@theme/*` specifiers fail to resolve; the import chain errors. The Liquid layout loads the import-map first, then `core.js`; per-project markup must preserve this order.

## Out of scope

- **Lazy module loading.** Every `@theme/*` module loads on `core.js` load. Splitting into "essential" + "optional" bundles is a build-time concern; today the surface is small enough that eager loading is fine.
- **Service-worker registration.** Not part of the entry point. PWA / offline features would compose at a separate layer when shipped.
- **Analytics / telemetry initialization.** Out of scope. The theme provides infrastructure; analytics is per-project (Shopify analytics, third-party tools, etc.).
- **Polyfills.** No polyfill imports. The theme baseline is modern browsers (ES modules + custom elements + `IntersectionObserver` etc. all supported). Per-project polyfill loading happens outside this module.
- **Bundle splitting / tree-shaking.** The re-exports are eager; tree-shaking applies at the build/bundler layer (not used today — Shopify themes load JS via `<script type="module">` directly). When a build pipeline ships, tree-shaking will work against `@theme/core` re-exports since they're standard ES re-exports.
- **Per-page route-aware initialization.** `init()` fires once per page load. SPA-style page transitions (Bucket B's `morph` + `section-renderer`) would need to coordinate with the section-renderer's lifecycle, not re-fire `init`.

## Related

- `base-component.md`, `events-manager.md`, `observers-manager.md`, `cache-manager.md`, `modifiers-manager.md`, `utils.md`, `dom.md`, `document-utils.md` — every dependency of `core.js`. The entry point ties them together; this spec describes the integration layer.
- `.context/rules/js-asset-convention.md` — names `core.js` as the entry point convention (re-exports, `window.Token` namespace setup, per-module specifiers via `@theme/<name>`)
- `snippets/utility--import-map.liquid` — wires the `@theme/*` module specifiers to cache-busted asset URLs; the layout's `<script type="module">` tag references `@theme/core` which resolves via this map
- `.context/docs/asset-loading.md` — explains the asset routing through `utility--core-assets`; `core.js` is one of the JS assets loaded
