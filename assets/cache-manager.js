/**
 * Type-based caching with selective invalidation and optional TTL expiration.
 * @module @theme/cache-manager
 * @version 2.0.0
 *
 * Changelog
 * - v2.0.0 — drop debug/over-engineered methods (getTypes, getSize, removeIf); private state via #caches; #ensureCache as true private method
 * - v1.0.0 — initial
 */

/**
 * Memoizes computed values by `(type, key)` pair. Common usage: cache `querySelector` results in a "dom" cache so each lookup only hits the DOM once per element lifetime.
 */
export class CacheManager {
  #caches = new Map([["dom", new Map()]]);

  /**
   * Returns the cached value for `(type, key)`, computing it via `computeFunction` on miss.
   * Honors per-entry TTL: expired entries are dropped and recomputed.
   * @param {string} type
   * @param {string} key
   * @param {Function} computeFunction
   * @returns {*}
   */
  get = (type, key, computeFunction) => {
    const cache = this.#ensureCache(type);

    if (cache.has(key)) {
      const entry = cache.get(key);
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        cache.delete(key);
      } else {
        return entry.value;
      }
    }

    const value = computeFunction();
    this.set(type, key, value);
    return value;
  };

  /**
   * Stores a value under `(type, key)` with optional TTL (ms).
   * @param {string} type
   * @param {string} key
   * @param {*} value
   * @param {number|null} [ttl=null]
   * @returns {*} The stored value.
   */
  set = (type, key, value, ttl = null) => {
    const cache = this.#ensureCache(type);
    cache.set(key, { value, expiresAt: ttl ? Date.now() + ttl : null });
    return value;
  };

  /**
   * Checks whether a value is cached at `(type, key)` (does not check TTL).
   * @returns {boolean}
   */
  has = (type, key) => this.#caches.get(type)?.has(key) ?? false;

  /**
   * Clears specific cache types or all caches.
   * @param {string|string[]} [types] - When omitted, clears every cache.
   * @returns {this}
   */
  clear = (types) => {
    if (types) {
      [].concat(types).forEach((type) => {
        this.#caches.get(type)?.clear();
      });
    } else {
      this.#caches.forEach((cache) => cache.clear());
    }
    return this;
  };

  #ensureCache = (type) => {
    if (!this.#caches.has(type)) this.#caches.set(type, new Map());
    return this.#caches.get(type);
  };
}
