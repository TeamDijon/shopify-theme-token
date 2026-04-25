/**
 * Centralized event listener management with cleanup.
 * @module @theme/events-manager
 * @version 2.0.0
 *
 * Changelog
 * - v2.0.0 — drop debug methods (getCount, getAllListeners); private state via #listeners; remove try/catch error swallowing (invalid inputs throw naturally)
 * - v1.0.0 — initial
 */

/**
 * Tracks event listeners by element so they can be torn down without manual bookkeeping.
 */
export class EventsManager {
  #listeners = new Map();

  /**
   * Adds an event listener and registers it for cleanup.
   * @param {EventTarget} element
   * @param {string} type
   * @param {Function} handler
   * @param {Object|boolean} [options={}]
   * @returns {this}
   */
  add = (element, type, handler, options = {}) => {
    element.addEventListener(type, handler, options);

    if (!this.#listeners.has(element)) {
      this.#listeners.set(element, new Set());
    }
    this.#listeners.get(element).add({ type, handler, options });

    return this;
  };

  /**
   * Checks whether a specific listener is registered.
   * @param {EventTarget} element
   * @param {string} type
   * @param {Function} handler
   * @returns {boolean}
   */
  has = (element, type, handler) => {
    const listeners = this.#listeners.get(element);
    if (!listeners) return false;
    for (const listener of listeners) {
      if (listener.type === type && listener.handler === handler) return true;
    }
    return false;
  };

  /**
   * Removes a specific listener.
   * @param {EventTarget} element
   * @param {string} type
   * @param {Function} handler
   * @returns {this}
   */
  remove = (element, type, handler) => {
    const listeners = this.#listeners.get(element);
    if (!listeners) return this;

    listeners.forEach((listener) => {
      if (listener.type === type && listener.handler === handler) {
        element.removeEventListener(type, handler, listener.options);
        listeners.delete(listener);
      }
    });

    if (listeners.size === 0) this.#listeners.delete(element);
    return this;
  };

  /**
   * Removes every listener attached to an element.
   * @param {EventTarget} element
   * @returns {this}
   */
  removeFrom = (element) => {
    const listeners = this.#listeners.get(element);
    if (!listeners) return this;

    listeners.forEach(({ type, handler, options }) => {
      element.removeEventListener(type, handler, options);
    });
    this.#listeners.delete(element);
    return this;
  };

  /**
   * Removes every managed listener (called on disconnectedCallback by BaseComponent).
   * @returns {this}
   */
  clear = () => {
    for (const [element, listeners] of this.#listeners) {
      listeners.forEach(({ type, handler, options }) => {
        element.removeEventListener(type, handler, options);
      });
    }
    this.#listeners.clear();
    return this;
  };
}
