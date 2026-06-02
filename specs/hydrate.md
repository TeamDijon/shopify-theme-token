# hydrate

**Layer**: substrate

**Type**: utility-js (`assets/hydrate.js`)

**Status**: shipped

**Implementation**: `assets/hydrate.js` v1.0.0 (single named export `hydrateOnVisible`)

**Reconciled**: 2026-06-02 — first build; matches spec API + Behavior. Added `hydrate` to `snippets/utility--import-map.liquid` v1.5.0 module_list. Not re-exported via `core.js` / `window.Token` (opt-in per ESM consumer, per spec).

**Reviewed**: 2026-06-01

**Depends on**: `IntersectionObserver` (Web platform built-in)

**Consumers**: planned — specialized sections with expensive `connectedCallback` setup that benefits from deferred hydration. Anticipated first consumers: `token-recommended-products` (defer until visible to avoid blocking initial paint), heavy image-gallery sections with codec-detection or carousel-setup costs, embedded video players. Consumers opt in per their own `connectedCallback` — no global registration.

## Purpose

Single-function utility for deferring expensive setup until an element approaches the viewport. Wraps `IntersectionObserver` with the common "fire once, then disconnect" pattern that's needed for hydration use cases. The default lookahead margin (200px) means setup fires *just before* the element scrolls into view — feels eager from the user's perspective, deferred from the bundle's perspective.

The utility is opt-in per consumer. `BaseComponent` stays eager (default browser custom-element upgrade); specialized sections that want deferred hydration wrap their `connectedCallback` setup with this helper. No fork in the BaseComponent lifecycle, no new abstraction at the base layer — it's a small composable building block subclasses reach for when they need it.

## API

A single named export:

| Function | Signature | Returns |
|---|---|---|
| `hydrateOnVisible(element, callback, options?)` | `(element: Element, callback: () => void, options?: { rootMargin?: string, root?: Element \| null, threshold?: number }) => void` | `undefined` |

Imported via the module specifier:

```js
import { hydrateOnVisible } from "@theme/hydrate";
```

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `element` | `Element` | yes | — | The element to observe. Typically `this` from inside a custom element's `connectedCallback`. |
| `callback` | `() => void` | yes | — | Fired exactly once, when `element` first intersects. The observer disconnects immediately after firing — re-entry into the viewport does NOT re-trigger. |
| `options.rootMargin` | `string` | no | `'200px'` | CSS rootMargin string (`'<top> <right> <bottom> <left>'` or shorthand). Default `200px` adds a 200-pixel pre-load lookahead on every side — setup fires just before the element enters the viewport. Per-call override when the consumer wants a different pre-load distance. |
| `options.root` | `Element \| null` | no | `null` (viewport) | The intersection root. Default uses the viewport. Pass a scrolling ancestor when the element lives inside an overflow-scrolled container. |
| `options.threshold` | `number` | no | `0` | The intersection threshold (0 = any pixel visible; 1 = fully visible). Default `0` triggers as soon as the element's bounding box overlaps the (margin-expanded) root. |

## Output shape

N/A — JS module, no DOM emission.

## CSS

N/A — JS module.

## CSS custom properties (exposed)

N/A — JS module.

## Behavior

- **Fire-once semantics.** The observer fires the callback on first intersection, then immediately calls `observer.disconnect()`. Re-entering the viewport doesn't re-trigger. The use case is hydration (setup-on-first-visibility), not visibility-driven animation; consumers wanting recurring visibility events use `IntersectionObserver` directly.
- **Lookahead via `rootMargin`.** The 200px default expands the intersection root by 200px in every direction. Fires when the element is *within 200px* of the viewport — the user perceives the hydration as already-happened by the time they scroll the element into view.
- **No observer caching.** Each call creates a fresh `IntersectionObserver`. Disconnects on fire. Consumers calling for the same element multiple times get multiple observers (each fires + disconnects independently). Defensive: don't call repeatedly for the same element + callback pair; that's the consumer's discipline.
- **Synchronous if already visible.** When `IntersectionObserver`'s observe is called on an element already intersecting the root, the callback fires on the next microtask (browser-spec behavior). Consumers should not assume synchronous execution from the `hydrateOnVisible` call itself.
- **No error handling.** Invalid arguments (non-Element, missing callback) throw naturally from `IntersectionObserver.observe`. The utility doesn't validate; consumers pass correct types or get the platform error.
- **No cleanup hook returned.** The utility doesn't return a teardown function — the fire-once + disconnect-on-fire pattern is self-cleaning. Consumers that need to cancel before the callback fires (e.g., the element disconnects from DOM before scrolling into view) wrap the call themselves with a `MutationObserver` or a cancellation token. Out of scope for v1.

### Usage pattern

```js
import { BaseComponent } from "@theme/base-component";
import { hydrateOnVisible } from "@theme/hydrate";

export class TokenRecommendedProducts extends BaseComponent {
  connectedCallback() {
    hydrateOnVisible(this, () => this.#loadRecommendations());
  }

  #loadRecommendations = async () => {
    const response = await fetch(this.dataset.recommendationsUrl);
    const html = await response.text();
    this.innerHTML = new DOMParser().parseFromString(html, "text/html").body.innerHTML;
  };
}

window.customElements.define("token-recommended-products", TokenRecommendedProducts);
```

The custom element registers eagerly (parser visit upgrades); `connectedCallback` runs eagerly per the browser; *the expensive part* (the fetch + DOM splice) defers until the element approaches the viewport.

## Locale keys

N/A — pure-logic JS module, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1d (substrate / utility-js).

- **Tier**: substrate — utility-js sub-shape
- **Harness**: none today. Future state runs Vitest under `tests/unit/hydrate.test.js`, importing the function directly and asserting against a jsdom-backed `IntersectionObserver` polyfill or a hand-mocked observer.
- **Unit scope** (prose; Vitest specs once installed):
  - **First-intersection callback firing**: spy on the callback; observe an element; trigger an intersection entry; assert the callback fired exactly once.
  - **Disconnect on fire**: after the callback fires, second intersection entries on the same observer do not re-trigger; the observer's `disconnect()` was called.
  - **Default rootMargin**: `IntersectionObserver` is constructed with `rootMargin: '200px'` when no option is passed (verified via mock-constructor arg inspection).
  - **Per-call rootMargin override**: passing `{ rootMargin: '50px' }` overrides the default.
  - **Per-call root override**: passing `{ root: scrollContainer }` constructs the observer with the custom root.
  - **Threshold default**: default threshold is `0`; per-call override accepted.
  - **No return value**: function returns `undefined`.
  - **Synchronous-visibility case**: element already in the viewport at observe time → callback fires asynchronously (on the next microtask, not synchronously from the `hydrateOnVisible` call itself).
- **Edge cases**:
  - `IntersectionObserver` not supported (very old browsers) → constructor throws; consumer's responsibility to feature-detect if needed (Token's browser baseline assumes support).
  - `element` is `null` / not a DOM node → `observer.observe(null)` throws from the platform; not guarded by the utility.
  - Element disconnects from DOM before intersection → no entry fires; observer holds a reference until garbage collection. Acceptable leak (small; bounded by the element's lifetime).
- **Integration scope**: a planned `token-recommended-products` section serves as the integration test surface. When that section ships, the validation page exercises the deferred-load behavior visually (scroll the page, watch the section's content materialize as it approaches the viewport).

## Implementation-time decisions

- **Cancellation token / return-value cleanup.** Consumers that need to cancel before fire (element disconnects from DOM, parent re-renders, etc.) currently have no hook. Adding a return value (`{ cancel: () => void }`) is trivial. Defer until a real consumer needs it — the fire-once + disconnect pattern handles 95% of use cases naturally.
- **Idle hydration variant.** A second function `hydrateOnIdle(callback, options?)` using `requestIdleCallback` (with a `setTimeout` fallback for Safari pre-baseline) covers the "do this when the browser is idle, regardless of visibility" case. Useful for non-visual setup (analytics warm-up, cache pre-population). Defer; add when the first consumer asks for it.
- **Interaction hydration variant.** `hydrateOnInteraction(element, callback, options?)` listening for first `pointerdown` / `focus` / `keydown` event before firing. Useful for "this will only matter if the user reaches for it" surfaces (modal contents, dropdown menus). Defer.
- **Combining strategies.** A future consumer might want "visible OR after 3 seconds" semantics. Compose via two separate `hydrateOnVisible` + `setTimeout` calls + a shared idempotency flag in the consumer. Don't over-abstract at the utility layer.

## Out of scope

- **`BaseComponent` integration.** This utility is opt-in per consumer's `connectedCallback`. `BaseComponent` does not add a hydration strategy field, lifecycle method, or behavior fork. The base class stays eager (default browser upgrade); subclasses with expensive setup reach for this utility deliberately.
- **Idle / interaction / media-query strategies.** This v1 ships *only* visible-based deferred hydration. Other strategies (idle, interaction, media-query) are flagged as future variants in Implementation-time decisions but not in v1.
- **Recurring intersection events.** This utility is fire-once. Consumers wanting recurring visibility events (scroll-triggered animations, viewport-aware tracking) use `IntersectionObserver` directly or via a separate utility.
- **Cancellation API.** v1 doesn't return a cleanup function. Add later if usage shows real need.
- **Server-side rendering hydration semantics** (React-style hydration). Shopify themes render server-side via Liquid; custom elements upgrade on parser visit. There's no "hydration mismatch" concept to handle. The "hydrate" terminology here is borrowed from islands-architecture conventions but means *deferred setup*, not *attaching to pre-rendered DOM*.

## Related

- `base-component.md` — discusses opt-in deferred hydration as an Out of scope item; cross-references this utility as the planned implementation
- `.context/rules/js-asset-convention.md` — naming, module specifier (`@theme/hydrate`), JSDoc, changelog conventions the implementation file (`assets/hydrate.js`) will follow
- `modifiers-manager.md` — sibling substrate utility-js spec (calibration reference for spec shape)
- `utility--color-contrast.md` — sibling substrate utility-snippet spec (calibration reference for a small single-function utility)
