/**
 * Attribute-based modifier management for HTML elements.
 * @module @theme/modifiers-manager
 * @version 2.0.0
 *
 * Changelog
 * - v2.0.0 — slim to actually-used surface (drop setValue, getValue, hasValue, getCount, keys, list); private methods via #parse/#serialize; hardcode attribute name; toggle reframed to value-aware (toggles by key, uses `:value` suffix as the value to add)
 * - v1.0.0 — initial
 */

const ATTRIBUTE_NAME = 'data-modifiers';

/**
 * Reads and mutates the `data-modifiers` attribute on an element.
 * Modifiers are comma-separated `key:value` (or bare `key`) tokens.
 *
 * @param {HTMLElement} element - The element to manage modifiers for.
 */
export class ModifiersManager {
  constructor(element) {
    this.element = element;
  }

  /**
   * Parses the modifiers attribute into typed entries.
   * @returns {Array<{key: string, value: string|null, raw: string}>}
   */
  #parse = () => {
    if (!this.element.hasAttribute(ATTRIBUTE_NAME)) return [];

    return this.element
      .getAttribute(ATTRIBUTE_NAME)
      .split(',')
      .map((modifier) => modifier.trim())
      .filter(Boolean)
      .map((raw) => {
        const colonIndex = raw.indexOf(':');
        if (colonIndex === -1) return { key: raw, value: null, raw };
        return {
          key: raw.substring(0, colonIndex),
          value: raw.substring(colonIndex + 1),
          raw,
        };
      });
  };

  /**
   * Serializes parsed entries back to attribute-string format.
   * @param {Array} parsed
   * @returns {string}
   */
  #serialize = (parsed) => parsed.map((m) => m.raw).join(', ');

  /**
   * Checks if the element has a specific modifier key.
   * @param {string} key
   * @returns {boolean}
   */
  has = (key) => this.#parse().some((m) => m.key === key);

  /**
   * Adds one or more modifiers (no-op if the key already exists).
   * @param {...string} modifiers - e.g. "active", "size:large"
   * @returns {this}
   */
  add = (...modifiers) => {
    const current = this.#parse();
    const currentKeys = current.map((m) => m.key);

    const toAdd = modifiers
      .map((raw) => {
        const colonIndex = raw.indexOf(':');
        if (colonIndex === -1) return { key: raw, value: null, raw };
        return {
          key: raw.substring(0, colonIndex),
          value: raw.substring(colonIndex + 1),
          raw,
        };
      })
      .filter((m) => !currentKeys.includes(m.key));

    if (toAdd.length === 0) return this;

    this.element.setAttribute(ATTRIBUTE_NAME, this.#serialize([...current, ...toAdd]));
    return this;
  };

  /**
   * Removes one or more modifier keys.
   * @param {...string} keys
   * @returns {this}
   */
  remove = (...keys) => {
    const updated = this.#parse().filter((m) => !keys.includes(m.key));

    if (updated.length === 0) {
      this.element.removeAttribute(ATTRIBUTE_NAME);
    } else {
      this.element.setAttribute(ATTRIBUTE_NAME, this.#serialize(updated));
    }
    return this;
  };

  /**
   * Adds or removes a single modifier based on a boolean condition.
   * @param {string} modifier - May include a `:value` suffix
   * @param {boolean} condition
   * @returns {this}
   */
  set = (modifier, condition) => {
    const key = modifier.split(':')[0];
    return condition ? this.add(modifier) : this.remove(key);
  };

  /**
   * Toggles a modifier by key — adds the full `key:value` token if the key isn't present, removes it if it is.
   * @param {string} modifier - May include a `:value` suffix; the key is everything before the first `:`
   * @returns {this}
   */
  toggle = (modifier) => {
    const key = modifier.split(':')[0];
    return this.set(modifier, !this.has(key));
  };

  /**
   * Removes all managed modifiers.
   * @returns {this}
   */
  clear = () => {
    this.element.removeAttribute(ATTRIBUTE_NAME);
    return this;
  };
}
