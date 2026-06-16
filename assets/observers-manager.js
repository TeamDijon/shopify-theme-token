/**
 * Centralized observer management with cleanup.
 * @module @theme/observers-manager
 * @version 3.0.0
 *
 * Changelog
 * - v3.0.0 — drop the per-type sugar methods (`resize`, `intersection`, `mutation`); callers use the canonical `add(element, type, handler, options)` form. Reduces surface area + matches CacheManager's no-sugar design.
 * - v2.0.0 — drop debug methods (getCount, getAllObservers); private state via #observers; remove try/catch error swallowing
 * - v1.0.0 — initial
 */

/**
 * Tracks ResizeObserver / IntersectionObserver / MutationObserver instances by element so they can be disconnected without manual bookkeeping.
 */
export class ObserversManager {
  #observers = new Map();

  /**
   * Creates and registers an observer for the given element.
   * @param {Element} element
   * @param {"resize"|"intersection"|"mutation"} type
   * @param {Function} handler
   * @param {Object} [options={}]
   * @returns {ResizeObserver|IntersectionObserver|MutationObserver}
   */
  add = (element, type, handler, options = {}) => {
    let observer;

    switch (type) {
      case 'resize':
        observer = new ResizeObserver(handler);
        observer.observe(element, options);
        break;
      case 'intersection':
        observer = new IntersectionObserver(handler, options);
        observer.observe(element);
        break;
      case 'mutation':
        observer = new MutationObserver(handler);
        observer.observe(element, options);
        break;
      default:
        throw new Error(`Invalid observer type: ${type}`);
    }

    if (!this.#observers.has(element)) {
      this.#observers.set(element, new Set());
    }
    this.#observers.get(element).add({ type, handler, observer });

    return observer;
  };

  /**
   * Checks whether a specific observer is registered.
   * @returns {boolean}
   */
  has = (element, type, handler) => {
    const observers = this.#observers.get(element);
    if (!observers) return false;
    for (const entry of observers) {
      if (entry.type === type && entry.handler === handler) return true;
    }
    return false;
  };

  /**
   * Disconnects a specific observer.
   * @returns {this}
   */
  remove = (element, type, handler) => {
    const observers = this.#observers.get(element);
    if (!observers) return this;

    observers.forEach((entry) => {
      if (entry.type === type && entry.handler === handler) {
        entry.observer.disconnect();
        observers.delete(entry);
      }
    });

    if (observers.size === 0) this.#observers.delete(element);
    return this;
  };

  /**
   * Disconnects every observer registered for an element.
   * @returns {this}
   */
  removeFrom = (element) => {
    const observers = this.#observers.get(element);
    if (!observers) return this;

    observers.forEach(({ observer }) => observer.disconnect());
    this.#observers.delete(element);
    return this;
  };

  /**
   * Disconnects every managed observer (called on disconnectedCallback by BaseComponent).
   * @returns {this}
   */
  clear = () => {
    for (const observers of this.#observers.values()) {
      observers.forEach(({ observer }) => observer.disconnect());
    }
    this.#observers.clear();
    return this;
  };
}
