# cache-manager

**Layer**: substrate

**Type**: utility-js (`assets/cache-manager.js`)

**Status**: shipped

**Implementation**: `assets/cache-manager.js` v2.0.0 (class)

**Reconciled**: 2026-06-01

**Reviewed**: 2026-06-02

**Depends on**: none — leaf module, no `@theme/*` imports

**Consumers**:
- `assets/base-component.js` v1.2.0 — every `<token-*>` custom element exposes a lazy `.cache` getter. The `dom` cache type is pre-initialized so `this.cache.get("dom", "section", () => …)` works without setup. `disconnectedCallback` calls `.clear()`. Full contract in `base-component.md`.
- `BaseComponent.section` getter — uses `this.cache.get("dom", "section", () => this.closest(".shopify-section"))` to memoize the DOM lookup across the element's lifetime.

## Purpose

An instance-per-element class for memoizing computed values by `(type, key)` pair. The common usage is the `dom` cache: a custom element caches `querySelector` / `closest` results so the DOM walk only happens once per element lifetime. Per-entry TTL is supported for cases where the cached value can stale (e.g., fetched data with a freshness window).

The class is internal infrastructure. Components reach it through `BaseComponent.cache`. The `dom` cache type is pre-initialized in the constructor; arbitrary additional types (`api`, `computed`, etc.) auto-vivify on first use.

## API

| Method | Params | Returns | Behavior |
|---|---|---|---|
| `constructor()` | — | instance | Initializes `#caches` with a pre-created `dom` cache (empty Map). Other cache types auto-create on first `set` / `get`. |
| `get(type, key, computeFunction)` | `type: string`, `key: string`, `computeFunction: () => any` | `any` (the cached or computed value) | Returns the cached value at `(type, key)`. On miss (or expired TTL): calls `computeFunction()`, stores the result under `(type, key)`, returns it. Lazy/memoized pattern. |
| `set(type, key, value, ttl?)` | `type: string`, `key: string`, `value: any`, `ttl?: number \| null` | the stored value | Stores `value` under `(type, key)` with optional TTL in milliseconds. When `ttl` is set, the entry records `expiresAt = Date.now() + ttl`; expired entries get dropped + recomputed on next `get`. Auto-creates the cache type if it doesn't exist. |
| `has(type, key)` | `type: string`, `key: string` | `boolean` | Returns `true` when an entry exists at `(type, key)`. **Does not check TTL** — an expired entry still reports `true` from `has`. Use `get` (with a compute function) for TTL-aware access. |
| `clear(types?)` | `types?: string \| string[]` | `this` | When `types` is set: clears only the named cache(s) (no-op if a named type doesn't exist). When omitted: clears every cache. Lifecycle method invoked by `BaseComponent.disconnectedCallback`. |

### Private state

- `#caches: Map<string, Map<string, { value, expiresAt }>>` — the outer map is keyed by cache type; the inner Map by entry key. Each entry holds the value + optional `expiresAt` timestamp (or `null` when no TTL).
- `#ensureCache(type)`: lazy initializer; creates the inner Map on first reference, returns it.

## Output shape

N/A — JS module, no DOM emission. The manager's effect is internal memoization.

## CSS

N/A — JS module.

## CSS custom properties (exposed)

N/A — JS module.

## Behavior

- **`dom` type pre-initialized.** The constructor seeds `#caches` with `["dom", new Map()]` — one Map allocation at construction time. The common pattern (`cache.get("dom", "section", () => this.closest(".shopify-section"))`) works without an explicit cache-type setup. Other types auto-vivify on first `set` / `get`.
- **`get` is the lazy-memoize entry point.** First call computes via `computeFunction`, stores, returns. Subsequent calls return the cached value. The compute function isn't called when the cache hits — guard expensive setup behind `cache.get` to avoid redundant work.
- **TTL is per-entry, not per-cache.** Different keys in the same cache type can have different TTLs. Useful when caching one piece of data fresh-for-30-seconds and another fresh-for-an-hour.
- **TTL stored as absolute timestamp.** `expiresAt = Date.now() + ttl` is captured at `set` time. Comparing against `Date.now()` at `get` time tells whether the entry is fresh. Time-shifts (system clock changes mid-session) could theoretically misbehave; not guarded against (negligible in practice).
- **Expired entries auto-delete on `get`.** The first `get` after expiry drops the entry from the cache + calls `computeFunction` to recompute. No background cleanup; expired entries persist in memory until the next `get` touches them.
- **`has` is TTL-blind.** An expired entry still reports `true` from `has`. The function checks Map presence, not freshness — `get` is the freshness-aware path (recomputes on expiry). The typical access pattern (`get(type, key, computeFn)`) doesn't reach for `has` at all; `has` exists for introspection where "is there any record at this key" is the relevant question.
- **`set` returns the stored value.** Symmetric with `get` returning the cached value. Useful for chaining (`const value = cache.set("dom", "thing", computeThing())` reads naturally).
- **`clear` is selective or full.** `cache.clear("dom")` empties just the dom cache; `cache.clear(["dom", "api"])` empties multiple; `cache.clear()` empties all. The selective form lets a component invalidate one concern without flushing unrelated caches.
- **No error swallowing.** Invalid arguments throw from native Map operations. Diagnosable; not silently absorbed.
- **`computeFunction` errors propagate.** When `get` calls the compute function and it throws, the error reaches the caller; no entry is stored. Subsequent `get` calls re-attempt.

### Lifecycle (when used via BaseComponent)

The base class exposes `.cache` as a lazy getter — the manager is constructed on first access, retained on the instance (`this._cache`), and `.clear()`-ed in `disconnectedCallback`. Components don't pay the construction cost until they actually use the cache. The pattern matches the sibling managers (`events`, `observers`, `modifiers`).

The `dom` cache type is what makes `BaseComponent.section` work — the getter memoizes the `closest(".shopify-section")` lookup so subsequent accesses return the cached match. `disconnectedCallback`'s `clear()` ensures a re-attached element re-resolves the section ancestor (which could legitimately differ if the element moves in the DOM).

## Locale keys

N/A — pure-logic JS module, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1d (substrate / utility-js).

- **Tier**: substrate — utility-js sub-shape
- **Harness**: none today. Future state runs Vitest under `tests/unit/cache-manager.test.js`, importing the class directly and asserting against in-memory fixtures.
- **Unit scope** (prose; Vitest specs once installed):
  - **Construction**: `new CacheManager()` initializes with a `dom` cache (empty); `has("dom", "anything")` returns `false`; other cache types haven't been created yet.
  - **`get(type, key, computeFunction)`**:
    - Miss → calls compute, stores, returns the computed value.
    - Hit → does not call compute; returns the cached value.
    - Spy on compute to assert call counts: hits should not re-invoke.
  - **TTL**:
    - `set("api", "thing", value, 100)` then `get` within 100ms → returns cached value, no compute call.
    - `get` after 100ms (jest fake timers) → expired entry dropped, compute called, new value returned.
  - **`has`**:
    - Returns `true` for any stored entry, expired or not.
    - Returns `false` for keys not present, even after the cache type was created.
  - **`clear`**:
    - `clear("dom")` empties only the dom cache; other caches persist.
    - `clear(["a", "b"])` empties two caches.
    - `clear()` (no arg) empties every cache.
    - `clear("nonexistent")` is no-op, does not throw.
  - **Chainability**: `clear` returns `this`. `set` returns the value (not `this`) — asymmetric on purpose, since callers typically want the value back.
  - **Auto-vivification**: `cache.set("custom-type", "key", value)` works without explicit type setup; `has("custom-type", "key")` returns `true` after.
  - **Edge cases**:
    - `ttl: 0` → entry expires immediately (`Date.now() > Date.now() + 0` is false at set, but borderline; in practice, the next `get` will compute fresh). Effectively "never cache" semantics.
    - `ttl: null` (default) → no expiry; entry persists until `clear`.
    - Storing `undefined` as a value → cached; `get` returns `undefined`; `has` returns `true` (the key exists with an undefined value).
    - Compute function returning a Promise → the Promise is stored as-is (not awaited); next `get` returns the same Promise reference. Callers needing async-safe caching should await before `set`-ing.

## Out of scope

- **Async-aware caching.** `get` and `set` are synchronous. Compute functions returning Promises store the Promise; callers handle the await pattern themselves (typically by awaiting before calling `set`, or by treating the cached Promise as the value).
- **Background cleanup of expired entries.** Expired entries persist in memory until the next `get` touches them. A long-lived component with TTL'd entries it never re-reads keeps the entries indefinitely. Not a real-world issue for the current scale; revisit if memory pressure surfaces.
- **LRU eviction / size limits.** The cache has no maximum size; entries accumulate until `clear` runs. Per-component caches are bounded by the component's lifetime (cleared on disconnect); document-level caches are bounded by the page session.
- **Cross-instance cache sharing.** Each `CacheManager` instance is independent. A shared cache across components would mean a singleton — out of scope for this class. Document-level singletons live in `document-utils.js`.
- **Cache invalidation by predicate.** Not provided. Selective invalidation happens by type (`clear("api")`) or full (`clear()`). Per-key invalidation (a `delete` method) would be the additive fix when usage data shows a real need.
- **Serialization / persistence.** The cache is in-memory only. Survive-reload caching uses platform APIs (`localStorage`, IndexedDB) outside this class.

## Related

- `base-component.md` — the primary consumer; uses the `dom` cache for the `section` getter; describes the lazy-getter / `disconnectedCallback` lifecycle that drives `.clear()`
- `events-manager.md` — sibling substrate utility-js spec (calibration reference for spec shape)
- `observers-manager.md` — sibling substrate utility-js spec; the no-sugar design v3.0.0 mirrored CacheManager's pattern
- `modifiers-manager.md` — sibling substrate utility-js spec (calibration reference); same v2.0.0 evolution pattern (drop debug methods, private state, no error swallowing)
- `.context/rules/js-asset-convention.md` — file structure (`@module @theme/cache-manager`, JSDoc, changelog) the implementation file follows
