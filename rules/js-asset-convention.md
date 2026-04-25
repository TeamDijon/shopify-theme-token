---
paths:
  - "assets/*.js"
---

# JS asset convention

## Naming

- `core.js` — entry point. Imports every module, re-exports them for consumers, and populates the `window.theme` namespace for inline scripts and Liquid templates.
- `<name>.js` — single-purpose module, no prefix (e.g. `utils.js`, `dom.js`, `events-manager.js`, `base-component.js`).
- Module specifiers use `@theme/<name>` via the import map (`snippets/utility--import-map.liquid`) — Liquid doesn't run in `assets/`, so this is the only place we can interpolate cache-busted `asset_url`s. When adding a module, append its filename (without `.js`) to the `module_list` array.

## Structure

1. **File-level JSDoc** — one-line purpose + `@module @theme/<name>` + `@version` tag
2. **Changelog** — `Changelog` list inside the file-level JSDoc, below `@version`. Omit on v1.0.0 only; required from any subsequent version.
3. **Named exports only** — no `export default`. Every exported symbol has its own JSDoc with `@param` and `@returns` (or `@type` for constants).
4. **Import from module specifiers**, not relative paths: `import { dom } from "@theme/dom";` (not `"./dom.js"`).

## Specialized section components

JS files paired with a specialized section (`sections/<name>.liquid` + `<theme-<name>>` custom element) follow this convention plus the worked example at `.context/docs/specialized-section-pattern.md`.

## Changelog

See `.context/docs/versioning-and-changelog.md` for format and policy.

- Location: inside the file-level JSDoc, below `@version`
- Interface-change trigger: new/removed/renamed exports, changed signatures, changed behavior

## Example

```js
/**
 * Pure utility functions for the experience library.
 * @module @theme/utils
 * @version 1.1.0
 *
 * Changelog
 * - v1.1.0 — add `debounce` export
 * - v1.0.0 — initial
 */

/**
 * Returns the root font size of the document in pixels.
 *
 * @returns {number} The root font size in pixels.
 */
export const getRootFontSize = () => {
  return parseFloat(getComputedStyle(document.documentElement).fontSize);
};
```
