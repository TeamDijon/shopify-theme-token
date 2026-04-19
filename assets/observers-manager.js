/**
 * Centralized observer management with cleanup.
 * @module @theme/observers-manager
 * @version 1.0.0
 */

/**
 * Manages observers (Resize, Intersection, Mutation) for easy addition and cleanup.
 * Provides centralized tracking of observers to prevent memory leaks.
 */
export class ObserversManager {
  constructor() {
    this._observers = new Map();
  }

  /**
   * Creates and adds an observer for the specified element.
   *
   * @param {Element} element - The element to observe.
   * @param {string} type - The type of observer ('resize', 'intersection', or 'mutation').
   * @param {Function} handler - The function to be called when changes are observed.
   * @param {Object} [options={}] - Options for the observer.
   * @returns {ResizeObserver|IntersectionObserver|MutationObserver|undefined} - The created observer.
   */
  add = (element, type, handler, options = {}) => {
    try {
      if (!(element instanceof Element)) {
        throw new Error("Invalid element provided to add", this);
      } else if (!["resize", "intersection", "mutation"].includes(type)) {
        throw new Error("Invalid observer type provided", this);
      }

      let observer;

      switch (type) {
        case "resize":
          observer = new ResizeObserver(handler);
          observer.observe(element, options);
          break;
        case "intersection":
          observer = new IntersectionObserver(handler, options);
          observer.observe(element);
          break;
        case "mutation":
          observer = new MutationObserver(handler);
          observer.observe(element, options);
          break;
      }

      if (!this._observers.has(element)) {
        this._observers.set(element, new Set());
      }

      this._observers.get(element).add({ type, handler, observer });

      return observer;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  };

  /**
   * Convenience method to add a resize observer.
   *
   * @param {Element} element - The element to observe resize events on.
   * @param {Function} handler - The function to be called when resize occurs.
   * @param {Object} [options={}] - Options for the resize observer.
   * @returns {ResizeObserver|undefined} - The created observer.
   */
  resize = (element, handler, options = {}) =>
    this.add(element, "resize", handler, options);

  /**
   * Convenience method to add an intersection observer.
   *
   * @param {Element} element - The element to observe intersection events on.
   * @param {Function} handler - The function to be called when intersection changes.
   * @param {Object} [options={}] - Options for the intersection observer.
   * @returns {IntersectionObserver|undefined} - The created observer.
   */
  intersection = (element, handler, options = {}) =>
    this.add(element, "intersection", handler, options);

  /**
   * Convenience method to add a mutation observer.
   *
   * @param {Element} element - The element to observe mutations on.
   * @param {Function} handler - The function to be called when mutations occur.
   * @param {Object} [options={}] - Options for the mutation observer.
   * @returns {MutationObserver|undefined} - The created observer.
   */
  mutation = (element, handler, options = {}) =>
    this.add(element, "mutation", handler, options);

  /**
   * Checks if a specific observer exists.
   *
   * @param {Element} element - The element to check.
   * @param {string} type - The type of observer.
   * @param {Function} handler - The handler function.
   * @returns {boolean} - Whether the observer exists.
   */
  has = (element, type, handler) => {
    if (!this._observers.has(element)) return false;

    const observers = this._observers.get(element);
    for (const entry of observers) {
      if (entry.type === type && entry.handler === handler) {
        return true;
      }
    }
    return false;
  };

  /**
   * Removes a specific observer.
   *
   * @param {Element} element - The element to remove the observer from.
   * @param {string} type - The type of observer to remove.
   * @param {Function} handler - The handler function to remove.
   * @returns {this} - For method chaining.
   */
  remove = (element, type, handler) => {
    if (!(element instanceof Element)) {
      console.error("Invalid element provided to remove");
      return this;
    }
    if (!this._observers.has(element)) return this;

    const elementObservers = this._observers.get(element);

    elementObservers.forEach((entry) => {
      if (entry.type === type && entry.handler === handler) {
        entry.observer.disconnect();
        elementObservers.delete(entry);
      }
    });

    if (elementObservers.size === 0) {
      this._observers.delete(element);
    }

    return this;
  };

  /**
   * Removes all observers for a specific element.
   *
   * @param {Element} element - The element to remove all observers from.
   * @returns {this} - For method chaining.
   */
  removeFrom = (element) => {
    const elementObservers = this._observers.get(element);
    if (!elementObservers) return this;

    elementObservers.forEach(({ observer }) => {
      observer.disconnect();
    });

    this._observers.delete(element);
    return this;
  };

  /**
   * Removes all observers.
   *
   * @returns {this} - For method chaining.
   */
  clear = () => {
    for (const observers of this._observers.values()) {
      observers.forEach(({ observer }) => {
        observer.disconnect();
      });
    }

    this._observers.clear();
    return this;
  };

  /**
   * Gets the count of managed observers.
   *
   * @returns {number} - The total number of managed observers.
   */
  getCount = () => {
    let count = 0;
    for (const observers of this._observers.values()) {
      count += observers.size;
    }
    return count;
  };

  /**
   * Gets all managed observers for debugging purposes.
   *
   * @returns {Array} - An array of all managed observers.
   */
  getAllObservers = () => {
    const allObservers = [];
    for (const [element, observers] of this._observers) {
      observers.forEach((entry) => {
        allObservers.push({ element, ...entry });
      });
    }
    return allObservers;
  };
}
