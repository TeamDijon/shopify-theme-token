/**
 * Flexible, type-based caching system with selective invalidation and optional expiration.
 * @module @theme/cache-manager
 * @version 1.0.0
 */

/**
 * Manages caching of values for improved performance.
 * Provides a flexible, type-based caching system with selective invalidation and optional expiration.
 */
export class CacheManager {
  constructor() {
    this.caches = new Map();
    this.caches.set("dom", new Map());
  }

  /**
   * Gets a cached value or computes and caches it if not present.
   *
   * @param {string} type - The cache type.
   * @param {string} key - The cache key.
   * @param {Function} computeFunction - Function to compute the value if not cached.
   * @returns {*} - The cached or computed value.
   */
  get = (type, key, computeFunction) => {
    const cache = this.ensureCache(type);

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
   * Sets a value in the cache with optional expiration.
   *
   * @param {string} type - The cache type.
   * @param {string} key - The cache key.
   * @param {*} value - The value to cache.
   * @param {number|null} [ttl=null] - Time-to-live in milliseconds (optional).
   * @returns {*} - The cached value.
   */
  set = (type, key, value, ttl = null) => {
    const cache = this.ensureCache(type);
    const entry = { value, expiresAt: ttl ? Date.now() + ttl : null };
    cache.set(key, entry);
    return value;
  };

  /**
   * Checks if a value exists in the cache.
   *
   * @param {string} type - The cache type.
   * @param {string} key - The cache key.
   * @returns {boolean} - Whether the value is cached.
   */
  has = (type, key) => {
    if (!this.caches.has(type)) return false;
    return this.caches.get(type).has(key);
  };

  /**
   * Clears specific cache types or all caches.
   *
   * @param {string|string[]} [types] - The cache types to clear. If omitted, clears all caches.
   * @returns {this} - For method chaining.
   */
  clear = (types) => {
    if (types) {
      [].concat(types).forEach((type) => {
        if (this.caches.has(type)) {
          this.caches.get(type).clear();
        }
      });
    } else {
      this.caches.forEach((cache) => cache.clear());
    }

    return this;
  };

  /**
   * Ensures a cache exists for the given type and returns it.
   *
   * @param {string} type - The cache type.
   * @returns {Map<string, any>} - The cache Map.
   */
  ensureCache = (type) => {
    if (typeof type !== "string") {
      throw new Error("Cache type must be a string");
    }
    if (!this.caches.has(type)) {
      this.caches.set(type, new Map());
    }
    return this.caches.get(type);
  };

  /**
   * Gets all available cache types.
   *
   * @returns {string[]} - Array of cache type names.
   */
  getTypes = () => {
    return Array.from(this.caches.keys());
  };

  /**
   * Removes cache entries that match a predicate function.
   *
   * @param {string|string[]} types - The cache types to check.
   * @param {Function} predicate - Function that returns true for entries to remove.
   * @returns {number} - Number of entries removed.
   */
  removeIf = (types, predicate) => {
    let removedCount = 0;
    const typeList = [].concat(types);

    typeList.forEach((type) => {
      if (!this.caches.has(type)) return;

      const cache = this.caches.get(type);
      for (const [key, value] of cache.entries()) {
        if (predicate(value, key, type)) {
          cache.delete(key);
          removedCount++;
        }
      }
    });

    return removedCount;
  };

  /**
   * Gets the size of a specific cache or all caches combined.
   *
   * @param {string} [type] - The cache type. If omitted, returns the total size of all caches.
   * @returns {number} - The size of the cache(s).
   */
  getSize = (type) => {
    if (type) {
      const cache = this.caches.get(type);
      return cache ? cache.size : 0;
    }
    return Array.from(this.caches.values()).reduce(
      (total, cache) => total + cache.size,
      0
    );
  };
}
