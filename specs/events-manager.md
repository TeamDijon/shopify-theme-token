# events-manager

**Layer**: substrate

**Type**: utility-js (`assets/events-manager.js`)

**Status**: shipped

**Implementation**: `assets/events-manager.js` v2.0.0 (class)

**Reconciled**: 2026-06-01

**Reviewed**: 2026-06-02

**Depends on**: none — leaf module, no `@theme/*` imports

**Consumers**:
- `assets/base-component.js` v1.2.0 — every `<token-*>` custom element exposes a lazy `.events` getter; `disconnectedCallback` calls `.clear()`. Full contract in `base-component.md`.
- Specialized sections (Bucket B, not yet shipped) — each will mount one EventsManager via its `BaseComponent` subclass

## Purpose

An instance-per-element class that wraps `addEventListener` / `removeEventListener` with bookkeeping. The manager remembers every listener it attached (keyed by element) and tears them all down on `clear()` — the lifecycle method that BaseComponent invokes on `disconnectedCallback`. The point is to remove the per-component "remember to detach the listener" discipline: components register through the manager and inherit cleanup for free.

The class is internal infrastructure. Components reach it through `BaseComponent.events`; document-level callers use ad-hoc instances. No `@theme/events-manager` consumer outside the BaseComponent lazy-getter chain today.

## API

All mutating methods return `this` for chaining.

| Method | Params | Returns | Behavior |
|---|---|---|---|
| `constructor()` | — | instance | No-arg construction. Internal `#listeners` Map starts empty. |
| `add(element, type, handler, options?)` | `element: EventTarget`, `type: string`, `handler: Function`, `options?: object \| boolean` | `this` | Calls `element.addEventListener(type, handler, options)` and records the triple `{ type, handler, options }` under `element` in the internal map. Duplicate adds (same triple) are not deduplicated — the DOM call goes through twice; both records are stored. |
| `has(element, type, handler)` | same as `add` minus options | `boolean` | Returns `true` when a record matching `(element, type, handler)` exists. Options are not part of the match key. |
| `remove(element, type, handler)` | same as `add` minus options | `this` | Removes every record matching `(element, type, handler)` (could be multiple if the same triple was added twice) and calls `removeEventListener` per record with that record's stored options. If the element's record set becomes empty, the element drops from the internal map. |
| `removeFrom(element)` | `element: EventTarget` | `this` | Calls `removeEventListener` for every record attached to `element`, then drops the element from the internal map. |
| `clear()` | — | `this` | Calls `removeEventListener` for every record across every element; empties the internal map. The lifecycle method invoked by `BaseComponent.disconnectedCallback`. |

### Private state

`#listeners: Map<EventTarget, Set<{ type, handler, options }>>` — the bookkeeping store. Keyed by element reference so multiple elements share one manager (BaseComponent's pattern: one manager per component, listening on `this` plus arbitrary descendants).

## Output shape

N/A — JS module, no DOM emission. The manager's effect is the DOM mutation performed by `addEventListener` / `removeEventListener` calls passed through.

## CSS

N/A — JS module.

## CSS custom properties (exposed)

N/A — JS module.

## Behavior

- **Element-keyed bookkeeping.** The manager groups records by element reference (Map key). A component attaching listeners to `this` and `this.querySelector(".thing")` keeps both element's record sets in the same manager; `clear()` walks every element and detaches everything. Per-element bookkeeping (vs. flat array) makes `removeFrom(element)` O(1) lookup.
- **Options carried verbatim.** The `options` argument (boolean capture flag or `{ capture, passive, once, signal }` object) is stored alongside the listener and replayed exactly on removal. `removeEventListener` requires the options to match the original add to actually detach the listener — the manager preserves them so callers don't have to.
- **No options match on remove.** `remove(element, type, handler)` removes every record matching `(element, type, handler)` regardless of stored options. A caller that attached the same handler twice with different options removes both records in one `remove` call. The DOM-level `removeEventListener` is called once per record with that record's options.
- **No deduplication on add.** Calling `add(el, "click", handler)` twice attaches the listener twice in the DOM and stores two records. The browser's `addEventListener` itself deduplicates identical `(type, handler, capture)` triples (per the spec), but the manager doesn't pre-check — it forwards the call and stores the record. Callers needing dedupe use `has()` first or de-dupe at their own layer.
- **No error swallowing.** Invalid arguments (non-EventTarget element, non-function handler) throw the platform error from `addEventListener` directly. Diagnosable; not silently absorbed.
- **AbortSignal divergence.** When a caller passes `{ signal }` and the signal aborts, the DOM layer detaches the listener but the manager's record persists until `remove` / `removeFrom` / `clear` runs. Functionally safe (a later `remove` is a no-op on an already-detached listener), but `has()` will return `true` for a record the DOM no longer holds. Callers using `AbortSignal`-based teardown should treat the manager's record as authoritative-by-time, not authoritative-by-DOM-state.
- **`clear()` is the BaseComponent contract.** BaseComponent's `disconnectedCallback` calls `.clear()` on its lazy-instantiated managers. Components that re-attach to the DOM (custom element re-attach is allowed by the platform) lose all listeners on detach; re-emitting initial listeners on re-attach is the consumer's responsibility.
- **Reference equality matters for handlers.** Inline-arrow-function handlers passed to `add` aren't equal across calls — a consumer doing `mgr.add(el, "click", () => doThing())` then trying `mgr.remove(el, "click", () => doThing())` will not find the record. Standard `addEventListener` discipline (store the handler reference; pass the same reference to add + remove).
- **No event bus, no dispatching.** The manager only attaches/detaches listeners on existing elements. Custom event dispatch and cross-component event coordination are out of scope (Bucket B's `theme-events.js` will own that channel when it ships).

### Lifecycle (when used via BaseComponent)

The base class exposes `.events` as a lazy getter — the manager is constructed on first access, retained on the instance (`this._events`), and `.clear()`-ed in `disconnectedCallback`. Components don't pay the construction cost until they actually attach a listener. The pattern matches the sibling managers (`observers`, `cache`, `modifiers`).

## Locale keys

N/A — pure-logic JS module, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1d (substrate / utility-js).

- **Tier**: substrate — utility-js sub-shape
- **Harness**: none today. Future state runs Vitest under `tests/unit/events-manager.test.js`, importing the class directly and asserting against a jsdom-backed `document.body.appendChild(element)` fixture.
- **Unit scope** (prose; Vitest specs once installed):
  - **Construction**: `new EventsManager()` does not touch the DOM. No listeners attached until `add()` is called.
  - **`add(element, type, handler)`**: spy on the handler; dispatch a matching event on the element; assert the handler fired. The record exists in internal state (verifiable via `has()`).
  - **`add` with options**: passing `{ once: true }` attaches a one-shot listener; the record remains in the manager's map after the handler fires (the DOM listener auto-detaches but the manager's bookkeeping stays). `remove()` still drops the record cleanly.
  - **`add` with `AbortSignal`**: passing `{ signal }` attaches the listener; aborting the signal detaches it at the DOM layer but the manager's record persists until `remove`/`removeFrom`/`clear` runs.
  - **`has(element, type, handler)`**: returns `true` after `add`, `false` before, `false` after `remove`/`removeFrom`/`clear`.
  - **`remove(element, type, handler)`**: drops the record + detaches at DOM layer; subsequent event dispatch does not fire the handler.
  - **`removeFrom(element)`**: every record on the element drops; events on the element still trigger any listener attached outside this manager.
  - **`clear()`**: walks every element + every record; every record is dropped; subsequent event dispatch on previously-listened elements does not fire any handler the manager tracked.
  - **Chainability**: every mutating method returns the same instance; `mgr.add(...).remove(...).clear()` executes in order.
  - **Multi-element**: one manager handles listeners on multiple elements; `removeFrom(elementA)` does not affect listeners on `elementB`.
  - **Edge cases**:
    - Duplicate `add` (same triple) → two records stored; `remove` drops both in one call; DOM-level deduplication is the browser's concern.
    - Non-EventTarget element → `addEventListener` throws naturally from the platform; manager doesn't pre-validate.
    - `clear()` on an empty manager → no-op, does not throw.

## Out of scope

- **Event bus / cross-component coordination.** Custom event dispatch (`element.dispatchEvent(new CustomEvent(...))`) and bus-style subscribe/publish patterns belong to a separate module (`theme-events.js`, Bucket B, not shipped). This manager only attaches and detaches platform listeners on existing elements.
- **Listener deduplication.** Calling `add` with the same triple twice stores two records. The browser deduplicates at the DOM layer per spec; the manager doesn't pre-check. Callers wanting dedupe use `has()` or de-dupe at their layer.
- **Delegated listeners.** The manager doesn't add a layer of delegation (attach to a parent, dispatch to a matching child). Delegation is a consumer-side pattern: caller listens on the parent, matches inside the handler. Adding delegation here would change the manager's role from "bookkeeping wrapper" to "event-routing system" — different scope.
- **Throttle / debounce wiring.** Callers compose `throttle` / `debounce` from `utils.js` around their handler before passing to `add`. The manager stores whatever it's given; lifecycle methods (`throttled.cancel()`) are caller-owned.
- **Schema enforcement.** Type strings (`"click"`, `"keydown"`) and options keys (`capture`, `passive`, `once`, `signal`) aren't validated. The platform validates at the DOM layer; the manager forwards.

## Related

- `base-component.md` — the primary consumer; describes the lazy-getter / `disconnectedCallback` lifecycle that drives `.clear()`
- `observers-manager.md` — sibling substrate utility-js spec (calibration reference for spec shape); identical lifecycle pattern around `IntersectionObserver` / `ResizeObserver` / `MutationObserver`
- `cache-manager.md` — sibling substrate utility-js spec (calibration reference)
- `modifiers-manager.md` — sibling substrate utility-js spec (calibration reference); same v2.0.0 evolution pattern (drop debug methods, private state, no error swallowing)
- `.context/rules/js-asset-convention.md` — file structure (`@module @theme/events-manager`, JSDoc, changelog) the implementation file follows
