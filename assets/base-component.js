/**
 * Base custom element for the theme library.
 * @module @theme/base-component
 * @version 1.1.0
 *
 * Changelog
 * - v1.1.0 — register as `<token-section>` (was `<theme-section>`). Per-project markup using the old tag must rename. Modifier `theme-root` is unchanged.
 * - v1.0.0 — initial
 */

import { EventsManager } from "@theme/events-manager";
import { ObserversManager } from "@theme/observers-manager";
import { CacheManager } from "@theme/cache-manager";
import { ModifiersManager } from "@theme/modifiers-manager";

/**
 * Base class for custom elements in the theme library.
 * Provides integrated utilities for event management, observers, caching, and modifiers.
 * Uses lazy initialization pattern - managers are only instantiated when first accessed.
 */
export class BaseComponent extends HTMLElement {
  constructor() {
    super();
  }

  disconnectedCallback() {
    if (this._events) this._events.clear();
    if (this._observers) this._observers.clear();
    if (this._cache) this._cache.clear();
    if (this._modifiers) this._modifiers.clear();
  }

  /**
   * Lazy getter for EventsManager instance.
   * @returns {EventsManager} The events manager for this component.
   */
  get events() {
    if (!this._events) {
      this._events = new EventsManager();
    }
    return this._events;
  }

  /**
   * Lazy getter for ObserversManager instance.
   * @returns {ObserversManager} The observers manager for this component.
   */
  get observers() {
    if (!this._observers) {
      this._observers = new ObserversManager();
    }
    return this._observers;
  }

  /**
   * Lazy getter for CacheManager instance.
   * @returns {CacheManager} The cache manager for this component.
   */
  get cache() {
    if (!this._cache) {
      this._cache = new CacheManager();
    }
    return this._cache;
  }

  /**
   * Lazy getter for ModifiersManager instance.
   * @returns {ModifiersManager} The modifiers manager for this component.
   */
  get modifiers() {
    if (!this._modifiers) {
      this._modifiers = new ModifiersManager(this);
    }
    return this._modifiers;
  }

  /**
   * Gets the closest parent section element.
   * @returns {HTMLElement|null} The closest parent section element or null if not found.
   */
  get section() {
    const section = this.closest(".shopify-section");
    if (!section) {
      console.warn("No parent section found for component:", this);
      return null;
    }

    return section;
  }
}

window.customElements.define("token-section", BaseComponent);
