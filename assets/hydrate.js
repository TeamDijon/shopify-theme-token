/**
 * Deferred-setup helpers — wrap expensive work in a visibility gate so it fires only when the element approaches the viewport.
 * @module @theme/hydrate
 * @version 1.0.0
 */

/**
 * Observes `element` and fires `callback` once when it first intersects the (margin-expanded) root, then disconnects. Re-entering the viewport does not re-trigger.
 *
 * @param {Element} element - The element to observe. Typically `this` from inside a custom element's `connectedCallback`.
 * @param {Function} callback - Fired exactly once on first intersection.
 * @param {Object} [options={}]
 * @param {string} [options.rootMargin='200px'] - CSS rootMargin string. Default adds a 200px lookahead on every side so setup fires just before the element scrolls into view.
 * @param {Element|null} [options.root=null] - Intersection root. `null` uses the viewport.
 * @param {number} [options.threshold=0] - Intersection threshold (0 = any pixel visible).
 * @returns {void}
 */
export const hydrateOnVisible = (element, callback, options = {}) => {
  const { rootMargin = '200px', root = null, threshold = 0 } = options;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          observer.disconnect();
          callback();
          return;
        }
      }
    },
    { rootMargin, root, threshold },
  );

  observer.observe(element);
};
