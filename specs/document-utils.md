# document-utils

**Layer**: substrate

**Type**: utility-js (`assets/document-utils.js`)

**Status**: shipped

**Implementation**: `assets/document-utils.js` v1.0.0 (3 named exports)

**Reconciled**: 2026-06-01

**Reviewed**: 2026-06-02

**Depends on**:
- `@theme/modifiers-manager` — `ModifiersManager` class, used to construct the `documentModifiers` singleton bound to `document.documentElement`
- Web Platform built-ins: `ResizeObserver` (scrollbar width tracking), `window.scrollY` + `document.documentElement.style` (scroll-lock mechanism), `CSSStyleDeclaration.setProperty` (CSS variable emission for `--scrollbar-width`)

**Consumers**:
- Any module needing to set html-level modifier state — `documentModifiers.add("dark-mode")`, etc.
- Modal / drawer flows requiring scroll-lock — read / set `documentScroll.isLocked`
- Code needing the current browser scrollbar gutter width — read `documentScrollbar.width` or consume the `--scrollbar-width` CSS variable (set by `documentScrollbar.updateWidth()` / observed via `observeWidth()`)
- `assets/core.js` v1.3.0 — re-exports into `window.Token.utils.*` for inline-script consumers

## Purpose

Three document-level singletons that don't fit the per-element manager pattern. They live as module-level eager exports because their bindings are global to the document — there's no "instance per element" relationship to model.

| Export | Role |
|---|---|
| `documentModifiers` | `ModifiersManager` instance bound to `document.documentElement` — manages html-level state (locked-scroll, theme switches, locale flags). |
| `documentScroll` | Scroll-lock helper. Locks the page scroll while a modal/drawer is open by freezing `scrollY` into `inset-block-start` + adding the `locked-scroll` modifier. |
| `documentScrollbar` | Scrollbar-width tracking + `--scrollbar-width` CSS variable emission. Lazy ResizeObserver on `document.documentElement`. |

The module holds document-level singletons that don't fit the per-element manager pattern.

## API

Three named exports.

### `documentModifiers`

```js
import { documentModifiers } from "@theme/document-utils";

documentModifiers.add("locked-scroll");
documentModifiers.has("dark-mode");
documentModifiers.remove("locked-scroll");
```

An eagerly-constructed `ModifiersManager` instance bound to `document.documentElement`. Full API documented in `modifiers-manager.md` — `add`, `has`, `remove`, `set`, `toggle`, `clear` per the class's standard surface.

No `clear()` lifecycle: the document element has no unload hook in the same sense as a custom element's `disconnectedCallback`. The singleton lives for the document session.

### `documentScroll`

```js
import { documentScroll } from "@theme/document-utils";

documentScroll.isLocked = true;   // lock — adds `locked-scroll` modifier + freezes scrollY
// ... modal flow ...
documentScroll.isLocked = false;  // unlock — removes modifier + restores scroll
```

A small object exposing one property:

| Property | Type | Behavior |
|---|---|---|
| `isLocked` | `boolean` (getter + setter) | Getter returns `documentModifiers.has("locked-scroll")`. Setter routes to lock / unlock logic per truthiness. |

**Lock mechanism** (when set to `true`):
1. `document.documentElement.style.scrollBehavior = "auto"` (prevents the lock from animating)
2. `document.documentElement.style.insetBlockStart = -<scrollY>px` (visually freezes the viewport at its current scroll position)
3. `documentModifiers.add("locked-scroll")` (CSS hook consumed by `position: fixed` rules on html/body — pairs with the inset-block-start freeze in step 2)

**Unlock mechanism** (when set to `false`):
1. `documentModifiers.remove("locked-scroll")` (removes the CSS hook)
2. `window.scrollTo(0, <previous scrollY>)` (restores scroll position from the stored `insetBlockStart` value)
3. Reset `insetBlockStart` + `scrollBehavior` styles to null

The lock-then-restore pattern is the convention for modal / drawer flows that need to prevent background scrolling. The CSS rule consuming `[data-modifiers~="locked-scroll"]` lives outside this module (consumer-side; typically in `layer-theme.css` or `core.css`).

### `documentScrollbar`

```js
import { documentScrollbar } from "@theme/document-utils";

documentScrollbar.width;          // current scrollbar gutter width (px), live-computed
documentScrollbar.updateWidth();  // re-measures and writes --scrollbar-width on documentElement
documentScrollbar.observeWidth(); // attaches lazy ResizeObserver; subsequent resizes auto-update
documentScrollbar.disconnectObserver();
```

An IIFE-wrapped object exposing 4 members:

| Member | Type | Behavior |
|---|---|---|
| `width` | `number` (getter) | `Math.max(0, window.innerWidth - document.documentElement.clientWidth)`. Live-computed; no caching. |
| `updateWidth()` | method | Re-reads `width`; sets `document.documentElement.style.setProperty('--scrollbar-width', '<value>px')`. Idempotent. |
| `observeWidth()` | method | Lazy-constructs a `ResizeObserver` on `document.documentElement` calling `updateWidth()` on resize. Returns the observer. Multiple calls return the same instance (idempotent). |
| `disconnectObserver()` | method | Disconnects the lazy observer if it exists; clears the internal reference. Next `observeWidth()` re-creates fresh. |

The `--scrollbar-width` CSS variable lets layout-aware components compose around the gutter (e.g., a sticky header avoiding the scrollbar's width when adjusting `right` positioning).

## Output shape

N/A — JS module. The visible side effects are:
- The `locked-scroll` modifier value on `document.documentElement`'s `data-modifiers` attribute (when `documentScroll.isLocked = true`)
- The `--scrollbar-width` CSS custom property on `document.documentElement` (when `documentScrollbar.updateWidth()` runs)
- The frozen `inset-block-start` inline style + `scroll-behavior: auto` on `document.documentElement` (during scroll-lock)

## CSS

N/A directly. The module mutates CSS-readable state (modifier attribute, CSS variable, inline styles) but doesn't author rules.

## CSS custom properties (exposed)

| Variable | Type | Source |
|---|---|---|
| `--scrollbar-width` | `<value>px` on `document.documentElement` | written by `documentScrollbar.updateWidth()`; updated by the `observeWidth()` ResizeObserver |

## Behavior

- **Module-level eager exports.** All three singletons are constructed at module load — no lazy initialization. The cost is one `ModifiersManager` + one closure per page. No-op for pages that never read the exports.
- **`documentModifiers` is a singleton, not a class.** Components reading html-level state share the same instance — mutations are globally visible. Contrast with per-element managers (BaseComponent.modifiers) where each component owns its instance.
- **`documentScroll.isLocked` is the truth-source via `documentModifiers`.** The getter delegates to `documentModifiers.has("locked-scroll")` — no separate internal state. So an external mutation (e.g., devtools setting the modifier directly) is reflected.
- **Scroll-lock mechanism is freeze-via-inset, not overflow-hidden.** Setting `overflow: hidden` on `html` would lose the scroll position on unlock (the document would scroll back to 0). The `inset-block-start` freeze preserves the visual position; on unlock, `window.scrollTo` restores from the stored value. The pattern handles modal/drawer flows where the user expects to return to where they were.
- **`scroll-behavior: auto` during lock.** Disables smooth-scroll animation during the lock transition. Restored on unlock. Without this, a fast lock/unlock cycle could trigger smooth-scroll animation visible as a jolt.
- **`documentScrollbar.width` clamps at 0.** On systems with overlay scrollbars (macOS default, mobile), `window.innerWidth - clientWidth` returns `0` (or theoretically negative under unusual conditions). `Math.max(scrollbarWidth, 0)` ensures non-negative output.
- **Lazy ResizeObserver.** `observeWidth()` constructs the observer on first call; subsequent calls return the existing instance. No multiple-observer wasteful setup. `disconnectObserver()` clears so re-observing creates fresh.
- **No `clear()` lifecycle.** Document-level singletons live for the page session. There's no `disconnectedCallback`-equivalent on `document.documentElement` to clear on. Page unload destroys the singletons naturally.

## Locale keys

N/A — pure-logic JS module, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1d (substrate / utility-js).

- **Tier**: substrate — utility-js sub-shape
- **Harness**: none today. Future state runs Vitest under `tests/unit/document-utils.test.js`, importing the singletons + asserting against jsdom fixtures.
- **Unit scope** (prose; Vitest specs once installed):
  - **`documentModifiers`**:
    - Is an instance of `ModifiersManager`.
    - Mutations are visible on `document.documentElement.getAttribute('data-modifiers')`.
    - Multiple imports return the same instance (module-level singleton verified).
  - **`documentScroll`**:
    - `isLocked` getter returns `false` initially, `true` after setting to `true`.
    - Setting `isLocked = true` writes `locked-scroll` modifier to html, freezes `insetBlockStart`, sets `scrollBehavior: auto`.
    - Setting `isLocked = false` removes the modifier, restores `scrollY` via `window.scrollTo`, clears inline styles.
    - Round-trip preserves scroll position: scroll to Y, lock, unlock → window.scrollY === Y.
  - **`documentScrollbar`**:
    - `width` returns a non-negative number; `0` in jsdom (no overlay vs gutter distinction).
    - `updateWidth()` writes `--scrollbar-width` on html with the current width value.
    - `observeWidth()` returns a ResizeObserver instance; subsequent calls return the same instance.
    - `disconnectObserver()` clears the internal reference; next `observeWidth()` creates fresh.
- **Edge cases**:
  - Concurrent `isLocked = true` calls → second call's `insetBlockStart` overwrites first's; on unlock, scroll restores to the second call's value (not the first). Caller responsibility to manage nested locks (typically: count opens / closes, lock on first open, unlock on last close).
  - `observeWidth()` called before `updateWidth()` → observer's first callback runs on the next layout, writing the initial `--scrollbar-width`.
  - Overlay-scrollbar OS (macOS, iOS) → `width` returns `0`; `--scrollbar-width: 0px` emits. Consumers compose with `var(--scrollbar-width, 0px)` — same fallback.

## Out of scope

- **Cross-component scroll-lock coordination.** Two modals both wanting `isLocked = true` simultaneously — first sets it, second is no-op; unlock by either re-enables scrolling. Coordination (nested locks via counter) is caller responsibility. Add a counted-lock pattern if real-world usage shows the need.
- **Per-element scroll-lock.** This module locks the document scroll. Locking scroll within a scrolling container (e.g., a modal's body) is a per-component pattern, not document-level.
- **Theme switching helpers.** A theme switcher would call `documentModifiers.add('theme:dark')` directly; no dedicated `documentTheme` helper today. Add if 2+ consumers surface a common pattern.
- **Locale / direction flags.** Same — direct `documentModifiers.add('locale:fr')` covers the simple case; no dedicated helper.
- **History / navigation state.** No `documentHistory` or route-aware singleton. Navigation lives at the consumer layer.
- **Performance instrumentation.** `PerformanceObserver` / `IntersectionObserver` document-level singletons aren't here. Add when a real consumer needs them.

## Related

- `modifiers-manager.md` — the class that `documentModifiers` instantiates; full API surface lives there
- `events-manager.md`, `observers-manager.md`, `cache-manager.md` — sibling substrate utility-js specs (per-element manager pattern; this module is the document-level counterpart for shared singletons)
- `core.md` — re-exports these singletons into `window.Token.utils.*` for inline-script consumers
- `utils.md` — pure-utility sibling spec (no DOM coupling); document-utils is the DOM-coupled sibling
- `.context/rules/js-asset-convention.md` — file structure (`@module @theme/document-utils`, JSDoc per export) the implementation file follows
