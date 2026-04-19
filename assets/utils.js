/**
 * Pure utility functions for the theme library.
 * @module @theme/utils
 * @version 1.0.0
 */

/**
 * Returns the root font size of the document in pixels.
 *
 * @returns {number} The root font size in pixels.
 */
export const getRootFontSize = () => {
  return parseFloat(getComputedStyle(document.documentElement).fontSize);
};

/**
 * Creates a throttled function that only invokes the provided callback at most once per animation frame.
 *
 * @param {Function} callback - The function to be throttled.
 * @returns {Function} A throttled version of the provided callback.
 */
export const throttle = (callback) => {
  let requestId = null;
  let lastArgs;

  const later = (context) => () => {
    requestId = null;
    callback.apply(context, lastArgs);
  };

  const throttled = function (...args) {
    lastArgs = args;
    if (requestId === null) {
      requestId = requestAnimationFrame(later(this));
    }
  };

  throttled.cancel = () => {
    cancelAnimationFrame(requestId);
    requestId = null;
  };

  return throttled;
};

/**
 * Creates a debounced function that delays invoking the provided callback function.
 *
 * @param {Function} callback - The function to be debounced.
 * @param {number} [delay=100] - The delay in milliseconds before invoking the callback.
 * @returns {Function} A debounced version of the provided callback.
 */
export const debounce = (callback, delay = 100) => {
  let timer = null;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      callback(...args);
    }, delay);
  };
};
