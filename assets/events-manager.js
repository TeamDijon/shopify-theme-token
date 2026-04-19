/**
 * Centralized event listener management with cleanup.
 * @module @theme/events-manager
 * @version 1.0.0
 */

/**
 * Manages event listeners for easy addition and removal.
 * Provides centralized tracking of events to prevent memory leaks.
 */
export class EventsManager {
  constructor() {
    this._listeners = new Map();
  }

  /**
   * Adds an event listener and manages it for easy cleanup.
   *
   * @param {EventTarget} element - The element to attach the event listener to.
   * @param {string} type - The type of event to listen for.
   * @param {Function} handler - The function to be called when the event occurs.
   * @param {Object|boolean} [options={}] - Options for the event listener.
   * @returns {this} - For method chaining.
   */
  add = (element, type, handler, options = {}) => {
    try {
      if (!(element instanceof EventTarget)) {
        throw new Error("Invalid element provided to add.", this);
      }

      element.addEventListener(type, handler, options);

      if (!this._listeners.has(element)) {
        this._listeners.set(element, new Set());
      }
      this._listeners.get(element).add({ type, handler, options });
    } catch (error) {
      console.error(error.message, this);
    }

    return this;
  };

  /**
   * Checks if a specific event listener exists.
   *
   * @param {EventTarget} element - The element to check
   * @param {string} type - The type of event
   * @param {Function} handler - The handler function
   * @returns {boolean} - Whether the event listener exists
   */
  has = (element, type, handler) => {
    if (!this._listeners.has(element)) return false;

    const listeners = this._listeners.get(element);
    for (const listener of listeners) {
      if (listener.type === type && listener.handler === handler) {
        return true;
      }
    }

    return false;
  };

  /**
   * Removes a listener for the event.
   *
   * @param {EventTarget} element - The element to remove the listener from.
   * @param {string} type - The type of event.
   * @param {Function} handler - The handler function to remove.
   * @returns {this} - For method chaining.
   */
  remove = (element, type, handler) => {
    if (!(element instanceof EventTarget)) {
      console.error("Invalid element provided to remove", this);
      return this;
    }
    if (!this._listeners.has(element)) return this;

    const elementListeners = this._listeners.get(element);

    elementListeners.forEach((listener) => {
      if (listener.type === type && listener.handler === handler) {
        element.removeEventListener(type, handler, listener.options);
        elementListeners.delete(listener);
      }
    });

    if (elementListeners.size === 0) {
      this._listeners.delete(element);
    }

    return this;
  };

  /**
   * Removes all event listeners for a specific element.
   *
   * @param {EventTarget} element - The element to remove all listeners from.
   * @returns {this} - For method chaining.
   */
  removeFrom = (element) => {
    if (!this._listeners.has(element)) return this;

    const elementListeners = this._listeners.get(element);
    elementListeners.forEach(({ type, handler, options }) => {
      element.removeEventListener(type, handler, options);
    });

    this._listeners.delete(element);

    return this;
  };

  /**
   * Removes all managed event listeners.
   *
   * @returns {this} - For method chaining.
   */
  clear = () => {
    for (const [element, listeners] of this._listeners) {
      listeners.forEach(({ type, handler, options }) => {
        element.removeEventListener(type, handler, options);
      });
    }
    this._listeners.clear();

    return this;
  };

  /**
   * Gets the count of managed listeners.
   *
   * @returns {number} - The total number of managed listeners.
   */
  getCount = () => {
    let count = 0;
    for (const listeners of this._listeners.values()) {
      count += listeners.size;
    }
    return count;
  };

  /**
   * Gets all managed listeners for debugging purposes.
   *
   * @returns {Array} - An array of all managed listeners.
   */
  getAllListeners = () => {
    const allListeners = [];
    for (const [element, listeners] of this._listeners) {
      listeners.forEach((listener) => {
        allListeners.push({ element, ...listener });
      });
    }
    return allListeners;
  };
}
