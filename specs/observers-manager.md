# observers-manager

**Layer**: substrate

**Type**: utility-js (`assets/observers-manager.js`)

**Status**: shipped

**Implementation**: `assets/observers-manager.js` v3.0.0 (class)

**Reconciled**: 2026-06-01

**Reviewed**: pending

**Depends on**: none — leaf module, no `@theme/*` imports. Wraps three Web Platform built-ins: `ResizeObserver`, `IntersectionObserver`, `MutationObserver`.

**Consumers**:
- `assets/base-component.js` v1.2.0 — every `<token-*>` custom element exposes a lazy `.observers` getter; `disconnectedCallback` calls `.clear()`. Full contract in `base-component.md`.
- Specialized sections (Bucket B, not yet shipped) — each will mount one ObserversManager via its `BaseComponent` subclass

## Purpose

An instance-per-element class that wraps the three built-in observer types (`ResizeObserver`, `IntersectionObserver`, `MutationObserver`) with bookkeeping. The manager creates observers on demand, tracks them by element, and disconnects every observer on `clear()` — the lifecycle method that BaseComponent invokes on `disconnectedCallback`. The point is to remove the per-component "remember to disconnect the observer" discipline: components register through the manager and inherit cleanup for free.

The class is internal infrastructure. Components reach it through `BaseComponent.observers`; document-level callers use ad-hoc instances. No `@theme/observers-manager` consumer outside the BaseComponent lazy-getter chain today.

## API

All mutating methods return either `this` (for chaining) or the created observer instance (for `add`, which returns the observer so the caller can configure it further if needed).

| Method | Params | Returns | Behavior |
|---|---|---|---|
| `constructor()` | — | instance | No-arg construction. Internal `#observers` Map starts empty. |
| `add(element, type, handler, options?)` | `element: Element`, `type: "resize" \| "intersection" \| "mutation"`, `handler: Function`, `options?: object` | observer instance | Constructs the matching observer (`ResizeObserver(handler)` / `IntersectionObserver(handler, options)` / `MutationObserver(handler)`), calls `.observe(element, options)` appropriately, and records `{ type, handler, observer }` under `element` in the internal map. Returns the observer so callers can hold a reference. Invalid `type` throws an `Error("Invalid observer type: <type>")` — strict whitelist. |
| `has(element, type, handler)` | same as `add` minus options | `boolean` | Returns `true` when a record matching `(element, type, handler)` exists. |
| `remove(element, type, handler)` | same as `add` minus options | `this` | Removes every record matching `(element, type, handler)` (disconnecting each observer) and drops the element's record set when empty. |
| `removeFrom(element)` | `element: Element` | `this` | Disconnects every observer attached to `element`, then drops the element from the internal map. |
| `clear()` | — | `this` | Disconnects every observer across every element; empties the internal map. The lifecycle method invoked by `BaseComponent.disconnectedCallback`. |

### Private state

`#observers: Map<Element, Set<{ type, handler, observer }>>` — element-keyed bookkeeping. Each record holds the observer reference (the concrete `ResizeObserver` / `IntersectionObserver` / `MutationObserver` instance) so `disconnect()` can be called per-record.

### Per-type construction patterns

The `add` method's `switch (type)` block encodes the three observer flavors' construction differences:

| Type | Constructor | Observe call | Options arg shape |
|---|---|---|---|
| `resize` | `new ResizeObserver(handler)` | `observer.observe(element, options)` | `{ box?: "content-box" \| "border-box" \| "device-pixel-content-box" }` |
| `intersection` | `new IntersectionObserver(handler, options)` | `observer.observe(element)` | `{ root, rootMargin, threshold }` (options-on-construct, per platform) |
| `mutation` | `new MutationObserver(handler)` | `observer.observe(element, options)` | `{ childList, attributes, subtree, ... }` |

The difference matters because `IntersectionObserver` accepts options at construction time (the root/rootMargin/threshold define the observer instance), while `ResizeObserver` and `MutationObserver` accept options at observe-call time (per-element). The manager preserves the platform's per-type contract.

## Output shape

N/A — JS module, no DOM emission. The manager's effect is the observer instances it creates, which call the consumer's `handler` when the underlying platform event fires.

## CSS

N/A — JS module.

## CSS custom properties (exposed)

N/A — JS module.

## Behavior

- **Element-keyed bookkeeping.** Records group by element reference (Map key). A component observing both `this` and a child `.thing` keeps both record sets in the same manager; `clear()` walks every element.
- **One observer per `add` call.** No deduplication. Calling `add(el, "resize", handler)` twice creates two `ResizeObserver` instances both observing the same element with the same handler — both fire on resize. Callers needing dedupe use `has()` first.
- **`IntersectionObserver` options are observer-scoped, not element-scoped.** Per the platform spec, an `IntersectionObserver` instance has fixed `root` / `rootMargin` / `threshold` set at construction. Observing multiple elements on the same observer uses the same threshold. The manager creates one observer per `add` call — this is intentional, so per-element threshold differences work. If a caller wants to share an observer across elements, they create their own IntersectionObserver outside the manager.
- **Per-type observe signatures preserved.** `ResizeObserver.observe(element, options)`, `IntersectionObserver.observe(element)` (options on constructor), `MutationObserver.observe(element, options)` — the manager routes correctly per `type`.
- **Invalid `type` throws.** The `switch` block has a `default` case that throws `Error("Invalid observer type: <type>")` — the manager is strict about its whitelist. Adding a new observer type would mean extending the switch.
- **`remove` disconnects per-record.** When two records match `(element, type, handler)` (duplicate add), `remove` disconnects both observers. The disconnect is per-instance, not per-target — `MutationObserver.disconnect()` clears its observation entirely (correct since the observer instance is single-target as created by the manager).
- **No error swallowing.** Per the v2.0.0 changelog, the manager removed defensive try/catch wrappers. Invalid arguments (non-Element element) throw from the platform `observe` call. Diagnosable; not silently absorbed.
- **No sugar methods.** v3.0.0 dropped `resize()`, `intersection()`, `mutation()` convenience methods. Callers use the canonical `add(element, type, handler, options)` form. Matches `CacheManager`'s no-sugar design — fewer surface points to maintain, type literal is the explicit contract.
- **`clear()` is the BaseComponent contract.** Like the sibling managers, `clear()` is what BaseComponent calls in `disconnectedCallback`. Re-attaching elements lose all observers; consumers re-emit on reattach if needed.

### Lifecycle (when used via BaseComponent)

The base class exposes `.observers` as a lazy getter — the manager is constructed on first access, retained on the instance (`this._observers`), and `.clear()`-ed in `disconnectedCallback`. Components don't pay the construction cost until they actually create an observer. The pattern matches the sibling managers (`events`, `cache`, `modifiers`).

## Locale keys

N/A — pure-logic JS module, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1d (substrate / utility-js).

- **Tier**: substrate — utility-js sub-shape
- **Harness**: none today. Future state runs Vitest under `tests/unit/observers-manager.test.js`, importing the class directly and asserting against jsdom-backed fixtures with hand-mocked or polyfilled observer constructors.
- **Unit scope** (prose; Vitest specs once installed):
  - **Construction**: `new ObserversManager()` does not create any observers. No platform calls until `add()` is invoked.
  - **`add(element, "resize", handler)`**: creates a `ResizeObserver` (verifiable via constructor spy), calls `observer.observe(element)`, returns the observer instance. The record exists in internal state (`has()` returns `true`).
  - **`add(element, "intersection", handler, { rootMargin: "200px" })`**: passes options to `IntersectionObserver` constructor (not to `observe`); subsequent intersections fire the handler.
  - **`add(element, "mutation", handler, { childList: true })`**: passes options to `mutation.observe(element, options)` (per platform contract); subtree mutations fire the handler when configured.
  - **`add` with invalid type**: throws `Error("Invalid observer type: <type>")` synchronously; no record added.
  - **`has(element, type, handler)`**: returns `true` after `add`, `false` after `remove`/`removeFrom`/`clear`.
  - **`remove(element, type, handler)`**: drops the record + calls `observer.disconnect()` on the platform observer; subsequent platform events do not fire the handler.
  - **`removeFrom(element)`**: every record on the element drops; observers tracking that element disconnect.
  - **`clear()`**: walks every element + every record; every observer disconnects; map empties.
  - **Chainability**: `mgr.add(...).remove(...).clear()` — `add` returns the observer (not `this`), so chaining via `add` doesn't compose; subsequent methods chain via `this`. (The asymmetry is intentional — `add`'s return value is the observer for caller access.)
  - **Multi-element**: one manager handles observers on multiple elements; `removeFrom(elementA)` does not affect `elementB`.
  - **Edge cases**:
    - Same `(element, type, handler)` added twice → two records, two observers; `remove` drops both.
    - Element disconnected from DOM after observe → platform observer holds a reference; manager's record persists until `remove`/`removeFrom`/`clear`. Acceptable leak bounded by element lifetime.
    - `IntersectionObserver` with element already intersecting at observe time → handler fires on next microtask (platform behavior); manager doesn't synchronize.

## Out of scope

- **Observer dedup.** Calling `add` with the same triple twice creates two observers. Callers wanting one-observer-per-pair use `has()` or de-dupe at their layer.
- **Shared observer across elements.** Each `add` creates a new observer. A consumer wanting one `IntersectionObserver` watching 100 elements (common pattern for viewport-aware lists) constructs the observer outside the manager and feeds elements to `observer.observe(...)` directly. The manager's bookkeeping cost would dominate for that pattern.
- **`PerformanceObserver` / `ReportingObserver` / future observer types.** The manager's whitelist is the three DOM-related observers. Adding new types means extending the `switch` block + the type-literal union; defer until a real consumer needs them.
- **Throttle / debounce wiring.** Callers compose `throttle` / `debounce` from `utils.js` around their handler before passing to `add`. The manager stores whatever it's given.
- **Per-type sugar methods.** v3.0.0 explicitly dropped `resize()` / `intersection()` / `mutation()`. The canonical `add(element, type, handler, options)` form is the contract; callers use the type literal directly.
- **Schema validation of options.** The manager forwards options to the platform constructors / observe calls verbatim. Invalid option shapes throw from the platform. No pre-validation.

## Related

- `base-component.md` — the primary consumer; describes the lazy-getter / `disconnectedCallback` lifecycle that drives `.clear()`
- `events-manager.md` — sibling substrate utility-js spec; identical lifecycle pattern around `addEventListener` / `removeEventListener`
- `cache-manager.md` — sibling substrate utility-js spec (calibration reference); the no-sugar design v3.0.0 mirrors
- `modifiers-manager.md` — sibling substrate utility-js spec (calibration reference); same v2.0.0 evolution pattern (drop debug methods, private state, no error swallowing)
- `hydrate.md` — planned substrate utility-js spec that wraps `IntersectionObserver` directly for the deferred-hydration use case (single-element, fire-once + auto-disconnect). The two coexist: `hydrate` is the convenience wrapper for one specific pattern; `ObserversManager` is the general bookkeeping wrapper for arbitrary observer patterns.
- `.context/rules/js-asset-convention.md` — file structure (`@module @theme/observers-manager`, JSDoc, changelog) the implementation file follows
