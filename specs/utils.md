# utils

**Layer**: substrate

**Type**: utility-js (`assets/utils.js`)

**Status**: shipped

**Implementation**: `assets/utils.js` v1.1.0 (3 named exports)

**Reconciled**: 2026-06-01

**Reviewed**: 2026-06-02

**Depends on**: none — leaf module, no `@theme/*` imports. Uses Web Platform built-ins: `requestAnimationFrame` / `cancelAnimationFrame` (throttle), `setTimeout` / `clearTimeout` (debounce), `getComputedStyle` + `document.documentElement` (root-font-size).

**Consumers**:
- `assets/core.js` v1.0.0 — re-exports under `window.Token.utils.*` (or similar) for backward-compat Liquid inline scripts; the `@theme/utils` module specifier is the modern path
- Any module wanting throttled scroll / resize handlers — wraps the handler via `throttle(handler)` before passing to event listeners
- Any module wanting debounced input / search handlers — wraps via `debounce(handler, delay)`
- Any module needing the document's root font-size in px (e.g., for `rem` ↔ `px` conversion) — calls `getRootFontSize()`

## Purpose

Three pure utility functions covering the common cross-cutting needs of theme JS: event-rate limiting via `throttle` and `debounce` (with `.cancel()` parity), and a `getRootFontSize()` helper for computed unit conversions. These are leaf-level building blocks consumed across the JS layer.

Each function ships with `.cancel()` symmetry where applicable — a throttled or debounced function exposes a method to cancel its pending invocation, preventing stale callbacks after a component disconnects or a route transitions away.

## API

Three named exports.

| Export | Signature | Notes |
|---|---|---|
| `getRootFontSize()` | `() => number` | Reads `getComputedStyle(document.documentElement).fontSize`, parses to float (px). |
| `throttle(callback)` | `(callback: Function) => (...args) => void` + `.cancel()` | Returns a throttled wrapper invoking `callback` at most once per animation frame. The returned function has a `.cancel()` method clearing the pending rAF. |
| `debounce(callback, delay?)` | `(callback: Function, delay?: number = 100) => (...args) => void` + `.cancel()` | Returns a debounced wrapper invoking `callback` after `delay` ms of quiet. Default `delay`: 100 ms. The returned function has a `.cancel()` method clearing the pending timeout. |

### `getRootFontSize()`

```js
import { getRootFontSize } from "@theme/utils";

const rootSize = getRootFontSize();  // e.g., 16
const remToPx = (rem) => rem * rootSize;
```

Returns a number (pixels). Reads the live computed `font-size` on `document.documentElement` each call — no caching. Callers needing repeated reads cache the value themselves (the root font-size rarely changes after page load).

### `throttle(callback)`

```js
import { throttle } from "@theme/utils";

const onScroll = throttle((event) => {
  // runs at most once per rAF tick
});
window.addEventListener("scroll", onScroll, { passive: true });

// later, when tearing down
onScroll.cancel();
```

The throttled function captures the latest call's args via closure (`lastArgs`); when the rAF fires, the callback is invoked with the most recent args. Intermediate calls between rAF ticks are coalesced.

`.cancel()` calls `cancelAnimationFrame(requestId)` and clears the pending state. Subsequent calls to the throttled function schedule a new rAF.

### `debounce(callback, delay)`

```js
import { debounce } from "@theme/utils";

const onSearchInput = debounce((query) => {
  fetch(`/search?q=${query}`);
}, 250);

input.addEventListener("input", (e) => onSearchInput(e.target.value));

// later
onSearchInput.cancel();
```

The debounced function clears any pending `setTimeout` on each call and schedules a fresh one. The callback fires only after `delay` ms of no calls. Default `delay`: 100 ms.

`.cancel()` calls `clearTimeout(timer)`, preventing the pending callback from firing. Subsequent calls to the debounced function schedule a new timeout.

## Output shape

N/A — JS module, no DOM emission.

## CSS

N/A — JS module.

## CSS custom properties (exposed)

N/A — JS module.

## Behavior

- **`getRootFontSize` reads live computed style.** Each call invokes `getComputedStyle(document.documentElement).fontSize` and parses to float. No memoization. The root font-size can change after page load (user preferences, dynamic root font sizing via JS), so a fresh read is the safe default. Callers reading repeatedly should cache the value themselves.
- **`throttle` is rAF-based.** Frame rate (typically 60 Hz, can be 120 Hz on high-refresh displays) drives the throttle window. The callback receives the most recent arguments at the time the rAF fires — intermediate calls are dropped, latest wins.
- **`throttle`'s `this` binding.** The throttled function preserves `this` via a curried closure (`later(this)`); a throttled method called via `obj.method(...)` retains `obj` as the callback's `this`. Useful for class methods used as event handlers without binding.
- **`debounce` resets on each call.** Every call clears the pending timer and schedules a new one. A rapid burst of N calls within `delay` ms produces exactly 1 invocation, after the burst ends + `delay` ms.
- **`debounce` default delay 100ms.** A sensible "wait a tenth of a second" for input-driven flows. Callers wanting longer (search, autocomplete typically 250–500 ms) or shorter (UI repaints typically 16–50 ms) pass an explicit delay.
- **`.cancel()` parity.** Both `throttle` and `debounce` expose `.cancel()` — resolves the symmetry gap surfaced in BACKLOG D5. Important for component-disconnect or route-transition flows where pending callbacks would fire on a torn-down target.
- **No `.flush()`.** Neither helper exposes a synchronous-flush method (force-fire the pending callback immediately). The use case is rare in this theme's UI patterns; add if a consumer surfaces a real need.
- **Pure functions, no internal state shared across instances.** Each `throttle(callback)` / `debounce(callback)` call creates a fresh closure with its own pending state. Two throttled wrappers around the same callback have independent rAF queues.

## Locale keys

N/A — pure-logic JS module, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1d (substrate / utility-js).

- **Tier**: substrate — utility-js sub-shape
- **Harness**: none today. Future state runs Vitest under `tests/unit/utils.test.js`, importing the functions directly. Fake timers (jest / vitest) for `setTimeout` paths; `requestAnimationFrame` polyfill for the throttle path.
- **Unit scope** (prose; Vitest specs once installed):
  - **`getRootFontSize`**:
    - Returns a number > 0 (typically 16 in jsdom default).
    - Re-read after setting `document.documentElement.style.fontSize = "20px"` returns 20.
    - Result is `parseFloat`-coerced — `15.5px` returns `15.5`.
  - **`throttle`**:
    - Calling the throttled function once → callback fires on the next rAF (1 invocation per N calls within one frame).
    - Calling 5 times within one frame → callback fires once, with the last call's args.
    - Calling once → wait for rAF → calling again → callback fires twice total (one per frame).
    - `.cancel()` clears the pending rAF; subsequent calls schedule a new one.
    - `this` binding preserved: `obj.method = throttle(obj.method); obj.method(...)` — the callback's `this` is `obj`.
  - **`debounce`**:
    - Calling once → callback fires after `delay` ms.
    - Calling N times within `delay` ms → callback fires once, `delay` ms after the last call, with the last call's args.
    - `.cancel()` clears the pending timeout; the callback does not fire.
    - Default delay 100 ms when no second arg.
  - **Edge cases**:
    - `throttle` with `cancel()` called inside the callback → no infinite loop; the rAF state is already cleared by the `later` closure before the callback runs.
    - `debounce(callback, 0)` → effectively a microtask deferral (`setTimeout(0)`); callback fires on the next macrotask.
    - Concurrent throttled handlers (two `throttle` wrappers, one event) → both schedule rAFs; both fire on the next frame.

## Out of scope

- **Memoization helpers** (e.g., `memoize`, `once`). The `CacheManager` class covers element-scoped memoization; standalone memoize utilities haven't earned their keep yet. Add when 2+ consumers need them.
- **Async helpers** (`sleep`, `withTimeout`, retry). Use platform `setTimeout` / `AbortSignal` / Promise patterns directly until a real need surfaces.
- **Animation primitives.** `requestAnimationFrame` wrappers, easing functions, tween helpers — out of scope. Animation lives in CSS (transitions / `@view-transition`) or in dedicated libraries when complex motion arrives.
- **Throttle / debounce with leading-edge invocation.** Both helpers fire trailing-edge only. Callers wanting "fire immediately, then throttle" use a different pattern (set a flag, schedule rAF to clear it). Out of scope; add a leading-edge option if a consumer demands.
- **`.flush()` for synchronous force-fire.** Not exposed. The cancel-and-recompute pattern covers the common need; flush is for niche use cases.
- **DOM utilities.** `dom.js` covers document-level getter sugar; `utils.js` is for pure-function helpers without DOM coupling. Read `dom.js` for selectors / element accessors.

## Related

- `base-component.md` — uses none of these directly today; future consumers (specialized sections from Bucket B) will compose `throttle` / `debounce` around event handlers
- `cache-manager.md` — sibling substrate utility-js spec; covers element-scoped memoization (different concern from these pure utilities)
- `dom.md` — sibling substrate utility-js with DOM-level lazy getters
- `core.md` — re-exports these utilities to `window.Token.utils.*` for inline-script consumers
- `.context/rules/js-asset-convention.md` — file structure (`@module @theme/utils`, JSDoc per export, changelog) the implementation file follows
