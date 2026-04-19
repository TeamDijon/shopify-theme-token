/**
 * Attribute-based modifier management for HTML elements.
 * @module @theme/modifiers-manager
 * @version 1.0.0
 */

/**
 * Manages attribute-based modifiers for HTML elements.
 * Provides methods to check, add, remove, toggle, and replace modifiers stored in a data attribute.
 *
 * @param {HTMLElement} element - The element to manage modifiers for.
 */
export class ModifiersManager {
  constructor(element) {
    this.element = element;
    this.attributeName = "data-modifiers";
  }

  /**
   * Parses the modifiers string into an array of objects
   * @private
   * @returns {Array<{key: string, value: string|null, raw: string}>}
   */
  _parse = () => {
    if (!this.element.hasAttribute(this.attributeName)) return [];

    return this.element
      .getAttribute(this.attributeName)
      .split(",")
      .map((modifier) => modifier.trim())
      .filter(Boolean)
      .map((raw) => {
        const colonIndex = raw.indexOf(":");
        if (colonIndex === -1) {
          return { key: raw, value: null, raw };
        }
        return {
          key: raw.substring(0, colonIndex),
          value: raw.substring(colonIndex + 1),
          raw,
        };
      });
  };

  /**
   * Serializes parsed modifiers back to string format
   * @private
   * @param {Array} parsed - Array of parsed modifier objects
   * @returns {string}
   */
  _serialize = (parsed) => {
    return parsed.map((m) => m.raw).join(", ");
  };

  /**
   * Gets the list of all modifiers on the element (raw strings).
   * @returns {string[]} Array of modifier strings.
   */
  list = () => {
    return this._parse().map((m) => m.raw);
  };

  /**
   * Gets all modifier keys (without values).
   * @returns {string[]} Array of modifier keys.
   */
  keys = () => {
    return this._parse().map((m) => m.key);
  };

  /**
   * Checks if the element has a specific modifier key.
   * @param {string} key - The modifier key to check for.
   * @returns {boolean} True if the element has the modifier key.
   */
  has = (key) => {
    return this._parse().some((m) => m.key === key);
  };

  /**
   * Gets the value of a modifier key.
   * @param {string} key - The modifier key.
   * @param {string|null} defaultValue - Default value if not found.
   * @returns {string|null} The value or default.
   */
  getValue = (key, defaultValue = null) => {
    const modifier = this._parse().find((m) => m.key === key);
    return modifier ? modifier.value : defaultValue;
  };

  /**
   * Checks if a modifier has a specific value.
   * @param {string} key - The modifier key.
   * @param {string} value - The value to check for.
   * @returns {boolean} True if the modifier has the specified value.
   */
  hasValue = (key, value) => {
    const modifier = this._parse().find((m) => m.key === key);
    return modifier ? modifier.value === value : false;
  };

  /**
   * Adds one or more modifiers to the element.
   * Can be simple strings or key:value pairs.
   * @param {...string} modifiers - Modifiers to add (e.g., "active", "size:large").
   * @returns {this} For method chaining.
   */
  add = (...modifiers) => {
    const current = this._parse();
    const currentKeys = current.map((m) => m.key);

    const toAdd = modifiers
      .map((raw) => {
        const colonIndex = raw.indexOf(":");
        if (colonIndex === -1) {
          return { key: raw, value: null, raw };
        }
        return {
          key: raw.substring(0, colonIndex),
          value: raw.substring(colonIndex + 1),
          raw,
        };
      })
      .filter((m) => !currentKeys.includes(m.key));

    if (toAdd.length === 0) return this;

    const updated = [...current, ...toAdd];
    this.element.setAttribute(this.attributeName, this._serialize(updated));

    return this;
  };

  /**
   * Removes one or more modifier keys from the element.
   * @param {...string} keys - Modifier keys to remove.
   * @returns {this} For method chaining.
   */
  remove = (...keys) => {
    const current = this._parse();
    const updated = current.filter((m) => !keys.includes(m.key));

    if (updated.length === 0) {
      this.element.removeAttribute(this.attributeName);
    } else {
      this.element.setAttribute(this.attributeName, this._serialize(updated));
    }

    return this;
  };

  /**
   * Sets or updates a modifier with a value.
   * @param {string} key - The modifier key.
   * @param {string|null} value - The value (null for simple modifier).
   * @returns {this} For method chaining.
   */
  setValue = (key, value = null) => {
    const current = this._parse();
    const existingIndex = current.findIndex((m) => m.key === key);

    const raw = value === null ? key : `${key}:${value}`;
    const newModifier = { key, value, raw };

    if (existingIndex !== -1) {
      current[existingIndex] = newModifier;
    } else {
      current.push(newModifier);
    }

    this.element.setAttribute(this.attributeName, this._serialize(current));
    return this;
  };

  /**
   * Toggles one or more modifier keys on the element.
   * @param {...string} keys - Modifier keys to toggle.
   * @returns {this} For method chaining.
   */
  toggle = (...keys) => {
    const current = this._parse();
    const currentKeys = current.map((m) => m.key);

    const toRemove = new Set(keys.filter((k) => currentKeys.includes(k)));
    const toAdd = keys
      .filter((k) => !currentKeys.includes(k))
      .map((k) => ({ key: k, value: null, raw: k }));

    const updated = [
      ...current.filter((m) => !toRemove.has(m.key)),
      ...toAdd,
    ];

    if (updated.length === 0) {
      this.element.removeAttribute(this.attributeName);
    } else {
      this.element.setAttribute(this.attributeName, this._serialize(updated));
    }

    return this;
  };

  /**
   * Sets a single modifier based on a condition
   * @param {string} modifier - The modifier to set (can include :value)
   * @param {boolean} condition - Whether to add (true) or remove (false) the modifier
   * @returns {this} For method chaining
   */
  set = (modifier, condition) => {
    const key = modifier.split(":")[0];
    return condition ? this.add(modifier) : this.remove(key);
  };

  /**
   * Clears all modifiers.
   * @returns {this} For method chaining.
   */
  clear = () => {
    this.element.removeAttribute(this.attributeName);
    return this;
  };

  /**
   * Gets the count of modifiers on the element.
   * @returns {number} The number of modifiers.
   */
  getCount = () => {
    return this._parse().length;
  };
}
