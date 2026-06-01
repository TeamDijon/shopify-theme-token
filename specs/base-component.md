# base-component

**Layer**: substrate

**Type**: utility-js (`assets/base-component.js`)

**Status**: shipped

**Implementation**: `assets/base-component.js` v1.2.0 (class + custom-element registration)

**Reconciled**: 2026-05-31 (paired with code change: `get section()` now caches the `closest('.shopify-section')` lookup via `CacheManager` to match ZAG's production pattern. Re-attach safely re-resolves via the cache-clear in `disconnectedCallback`.)

**Reviewed**: 2026-05-31

**Depends on**:
- `assets/events-manager.js` (EventsManager class)
- `assets/observers-manager.js` (ObserversManager class)
- `assets/cache-manager.js` (CacheManager class)
- `assets/modifiers-manager.js` (ModifiersManager class)
- `HTMLElement` (Web Components platform built-in)

**Consumers**:
- `sections/section.liquid` v1.5.0 — emits `<token-section>` as the inner element of every standard section, carrying `theme-root,color-scheme:<id>` modifiers
- Future specialized sections (`<token-cart>`, `<token-header>`, `<token-footer>` per `composition-strategy.md` Beyond-L2) — extend `BaseComponent` rather than register `<token-section>` directly
- `assets/core.js` v1.3.0 — re-exports `BaseComponent` as an ES module export and as `window.Token.components.BaseComponent` for inline scripts and Liquid templates

## Purpose

The custom-element foundation. `BaseComponent` is the class every theme custom element extends; the file also registers it directly as `<token-section>`, the standard section host. Its job is to wire each instance into the four manager subsystems (events, observers, cache, modifiers) with **lazy instantiation** and **automatic teardown on disconnect**, so subclasses don't pay setup cost for managers they never touch and don't need to write cleanup glue.

Beyond the class, the file is the binding point between the theme's JS runtime and the section pattern: `sections/section.liquid` writes `<token-section>` markup; the browser instantiates an instance of this class; section CSS targets the element via tag or `[data-modifiers*='theme-root']` selectors. Specialized sections subclass `BaseComponent` to inherit the manager wiring while registering their own tag (`<token-cart>`, etc.).

## API

The class exposes a small surface: one constructor, one lifecycle hook, five getters.

| Member | Kind | Returns | Behavior |
|---|---|---|---|
| `constructor()` | constructor | instance | Calls `super()`. No instance state initialized — all managers are lazy. |
| `disconnectedCallback()` | lifecycle | — | Web Components hook fired when the element detaches from the DOM. Calls `.clear()` on every manager that was instantiated (`this._events`, `this._observers`, `this._cache`, `this._modifiers`). Managers that were never accessed stay `undefined` (no cleanup needed). |
| `get events` | getter | `EventsManager` | Lazy: constructs `new EventsManager()` on first access, retains on `this._events`, returns the same instance on subsequent accesses. |
| `get observers` | getter | `ObserversManager` | Lazy. Same pattern as `events`. |
| `get cache` | getter | `CacheManager` | Lazy. Same pattern as `events`. |
| `get modifiers` | getter | `ModifiersManager` | Lazy: constructs `new ModifiersManager(this)` (binds the manager to *this* element). Same retention pattern. |
| `get section` | getter | `HTMLElement \| null` | Returns `this.closest(".shopify-section")` cached via `this.cache.get("dom", "section", ...)`. When no match (component used outside a section context), logs one `console.warn` with the element reference and returns `null` (cached as null). `disconnectedCallback` clears the cache, so re-attach re-resolves naturally. |

The class is exported as a named export (`export class BaseComponent extends HTMLElement`). No default export — consistent with the JS asset convention.

### Custom-element registration

Module-level side effect, immediately after the class body:

```js
window.customElements.define("token-section", BaseComponent);
```

Registers the base class itself as `<token-section>` — the standard section host. Specialized sections register their own tags via subclass `define` calls in their own files (e.g., `assets/cart.js` would `window.customElements.define("token-cart", class extends BaseComponent { … })`).

## Output shape

The class emits no DOM of its own; it inhabits markup written by Liquid sections. The runtime contract:

```html
<token-section data-modifiers="theme-root,color-scheme:scheme-1">
  <!-- section content -->
</token-section>
```

`<token-section>` is the canonical section host. The `theme-root` modifier identifies the element as a theme-owned CSS scope root (see `theme-root.md` for the full contract — bleed grid, rhythm cascade, color scheme scope). `color-scheme:<id>` carries the section's chosen color scheme.

Specialized-section markup follows the same pattern with the tag swapped:

```html
<token-cart data-modifiers="theme-root,color-scheme:scheme-1">
  <!-- cart content -->
</token-cart>
```

The element's only structural commitment is the tag name; everything else (modifiers, content, layout) is the caller's responsibility.

## CSS

N/A — JS module, no markup or styles.

## CSS custom properties (exposed)

N/A — JS module.

## Behavior

- **Lazy manager instantiation.** Managers are not constructed in the constructor. The first `instance.events` / `.observers` / `.cache` / `.modifiers` access constructs the manager and caches it on the private-by-convention field (`_events`, etc.). A `<token-section>` instance that never touches modifiers pays no `ModifiersManager` setup cost.
- **Per-instance manager ownership.** Each custom-element instance owns its own four managers. Two `<token-section>` elements have two independent `EventsManager`s, etc. No global manager pool.
- **`disconnectedCallback` clears only-accessed managers.** The cleanup loop tests `if (this._events) this._events.clear()` per manager — skips the clear when the manager was never instantiated. Combined with lazy access, never-touched managers cost nothing across the full instance lifecycle. 
- **Re-attachment resets manager state.** When an element disconnects and re-attaches (custom elements aren't destroyed on detach), the cleared managers stay on the instance but their internal state has been cleared (`events` map empty, `observers` disconnected, `cache` empty, `modifiers` attribute wiped). Subsequent accesses use the same manager instances but start from empty state. Subclasses that need to re-emit initial modifiers on re-attach do so in their own `connectedCallback`. The retain-instance-clear-state pattern avoids four-allocation manager reconstruction per detach-reattach cycle for re-attach-heavy use cases (cart drawer reopened, modal toggled). Matches ZAG's production pattern.
- **`modifiers` manager is constructed with `this`.** Unlike the other three managers, `ModifiersManager` takes an element argument — the manager mutates the element's `data-modifiers` attribute. The lazy getter binds the manager to the instance: `new ModifiersManager(this)`. See `modifiers-manager.md` § Lifecycle (when used via BaseComponent) for the consequences on re-attach.
- **`section` getter is cached via `CacheManager`.** The first access computes `closest('.shopify-section')` and stores the result in the `"dom"` cache under key `"section"`; subsequent accesses return the cached match. `disconnectedCallback` clears the cache through the universal cleanup loop, so re-attach safely re-resolves. Matches ZAG's production `ZagComponent.get section()` pattern. Side effect: any component touching `.section` mounts `CacheManager` lazily on first access — non-consumers pay nothing.
- **No `connectedCallback` in the base class.** Subclasses implementing setup-on-attach add their own `connectedCallback`. The base class doesn't define one, so there's no `super.connectedCallback()` obligation to remember.
- **No shadow DOM.** The class extends `HTMLElement` directly, not via `attachShadow`. Light-DOM children (the section's blocks) are addressable by Liquid, CSS, and outer-scope selectors — the central design choice (merchant CSS reaches everything; sections compose blocks via real DOM nesting). A specialized section with self-contained interior styling (cart drawer's interior, quick-view modal's contents) can opt into shadow within its own subclass via Declarative Shadow DOM (server-renderable from Liquid as `<template shadowrootmode="open">`); not a default.
- **No `observedAttributes` / `attributeChangedCallback`.** The base class doesn't observe attribute changes — `data-modifiers` mutations go through `ModifiersManager` writes directly. The caller knows it changed something and can react synchronously after the manager call; no need for the browser-level callback. Subclasses with genuine attribute-reactive behavior (rare) add `static get observedAttributes()` and `attributeChangedCallback(name, old, new)` themselves.

### Subclassing pattern

Specialized sections extend `BaseComponent` and add per-section behavior:

```js
import { BaseComponent } from "@theme/base-component";

export class TokenCart extends BaseComponent {
  connectedCallback() {
    this.events.add(this, "submit", this.#handleSubmit);
    this.observers.add(this, "intersection", this.#handleVisible);
  }

  #handleSubmit = (event) => { /* ... */ };
  #handleVisible = (entries) => { /* ... */ };
}

window.customElements.define("token-cart", TokenCart);
```

Class names carry the `Token` prefix to match the `<token-*>` tag and avoid collisions if the codebase is ported into a host that already defines a generic `Cart` class. The convention applies to every specialized-section subclass: `TokenCart`, `TokenHeader`, `TokenFooter`, etc.

The four managers are inherited; manual cleanup glue isn't needed. See `specialized-section-pattern.md` for the full worked example.

## Locale keys

N/A — pure-logic JS module, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1d (substrate / utility-js).

- **Tier**: substrate — utility-js sub-shape
- **Harness**: none today. Future state runs Vitest under `tests/unit/base-component.test.js`, importing `BaseComponent` directly and asserting against a jsdom-backed `document.body.appendChild(element)` fixture. Custom-element registration tests use a fresh test class to avoid double-registering `<token-section>`.
- **Unit scope** (prose; Vitest specs once installed):
  - **Construction**: `new BaseComponent()` (or `document.createElement('token-section')`) yields an instance with `_events`, `_observers`, `_cache`, `_modifiers` all `undefined`.
  - **Lazy getter `events`**:
    - First access constructs an `EventsManager`; instance is retained on `_events`.
    - Subsequent accesses return the same instance reference.
    - Manager construction is observable via `vi.spyOn(EventsManager.prototype, 'constructor')` or an instance-identity check.
  - **Lazy getter `observers` / `cache` / `modifiers`**: same pattern.
  - **`modifiers` binding**: the manager's target element is `this` (the component instance) — verifiable by `instance.modifiers.add('foo')` then asserting `instance.getAttribute('data-modifiers') === 'foo'`.
  - **`disconnectedCallback` selective clear**:
    - Element with no manager accesses → `disconnectedCallback()` runs without invoking any `.clear()` (no fields are truthy).
    - Element with `events` accessed → only `_events.clear()` is called; other manager fields untouched.
    - Element with all four accessed → all four `.clear()` calls fire.
  - **Re-attachment**: detach + re-attach via `element.remove()` + `parentNode.appendChild(element)` — manager instances persist on the fields, but their internal state was cleared on detach. Asserted by re-reading `data-modifiers` (empty) and verifying `events` map is empty.
  - **`section` getter**:
    - With `.shopify-section` ancestor → returns the matched element; second access returns the cached reference (assert by `===` identity, not just equality).
    - Without `.shopify-section` ancestor → returns `null` and logs one `console.warn` (assert via `vi.spyOn(console, 'warn')`); subsequent accesses return the cached `null` without re-warning.
    - Re-attachment to a *different* `.shopify-section` parent → `disconnectedCallback` clears the cache on detach; the next `.section` access after re-attach re-resolves to the new ancestor (not the stale one).
  - **Custom-element registration**:
    - `window.customElements.get('token-section') === BaseComponent`.
    - `document.createElement('token-section')` returns a `BaseComponent` instance.
- **Edge cases**:
  - Re-importing the module would attempt to re-register `<token-section>` — caught by the browser as a `DOMException`. Asserted via attempted double-`define` in a unit test, expecting the throw.
  - Calling a lifecycle method on a never-connected element (`new BaseComponent(); instance.disconnectedCallback()`) is a no-op — no truthy manager fields, no work to do.

## Out of scope

- **Manager class internals** — each of `EventsManager` / `ObserversManager` / `CacheManager` / `ModifiersManager` ships its own contract. `modifiers-manager.md` exists; the other three are deferred per the substrate audit (`Defer until adjacent work forces it`).
- **`<token-section>` Liquid emission** — covered by `section.md` (the section host spec). This spec covers the JS class and the element registration; the Liquid that writes the tag belongs to its consumer.
- **`theme-root` modifier semantics** — bleed grid, rhythm cascade, color scheme scope, body appearance defaults all live in `theme-root.md` (the substrate doc that describes the modifier's CSS contract). This spec covers what writes `<token-section>` into the page; what the modifier *does once written* is the substrate's job.
- **Specialized-section authoring pattern** — covered by `specialized-section-pattern.md` (worked example: Liquid + JS pair, custom element subclass, manager usage, opt-out from bleed grid). This spec defines the base class subclasses extend; the authoring rhythm lives in the doc.
- **`<token-layout>`** — separate custom element (`assets/token-layout.js`, the inner-wrapper anchor for container blocks). Empty class, no manager wiring; doesn't extend `BaseComponent`. See `group.md` / `columns.md` for its consumer contract.
- **`window.Token` namespace** — populated by `core.js`, not by this file. The base-component module exports the class; the namespace plumbing is the entry point's job. The `Token` namespace name (renamed from generic `window.theme` in `core.js` v1.3.0) matches the `<token-*>` tag prefix + the `TokenCart` class-naming convention; collision-safe when ported into hosts with their own scripts.
- **Shadow DOM / declarative shadow DOM** — the base class is light-DOM only by design. A subclass wanting shadow DOM scopes it in its own constructor (not via the base class).
- **SSR / hydration** — Shopify renders sections via Liquid in HTTP responses; there's no hydration step. Custom elements upgrade on parser visit. **Deferred hydration** (island-style — wait until the element is visible / idle before triggering subclass setup) is opt-in per subclass via the utility documented in `hydrate.md` (planned). The base class stays eager (default browser custom-element upgrade); subclasses with expensive setup wrap their `connectedCallback` work in `hydrateOnVisible(...)` to defer until the element enters the viewport. No base-class API change.

## Related

- `modifiers-manager.md` — sibling JS spec; the manager `BaseComponent` lazy-instantiates with `this` binding for every theme custom element.
- `theme-root.md` — the modifier contract that `<token-section>` (and every `BaseComponent` subclass) carries: bleed grid, rhythm cascade, color scheme scope.
- `section.md` — the section host spec; canonical consumer of `<token-section>`.
- `specialized-section-pattern.md` — the worked example for subclassing `BaseComponent` into a specialized section (Liquid + JS pair, custom-element naming, opt-out conventions).
- `hydrate.md` — planned substrate utility-js spec for opt-in deferred hydration (`hydrateOnVisible`); BaseComponent stays eager, subclasses opt in per their own connectedCallback.
- `.context/rules/js-asset-convention.md` — naming, module specifier, JSDoc, changelog conventions every JS asset (including this one) follows.
- `.context/rules/section-convention.md` § Specialized section — when to subclass `BaseComponent` vs use the canonical `<token-section>`.
