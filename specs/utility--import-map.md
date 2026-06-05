# utility--import-map

**Layer**: substrate

**Type**: utility-snippet (`snippets/utility--import-map.liquid`)

**Status**: shipped

**Implementation**: `snippets/utility--import-map.liquid` v1.5.0 (ES module import-map emitter)

**Reconciled**: 2026-06-05

**Reviewed**: 2026-06-05

**Depends on**: Shopify's `| asset_url` filter (resolves to the cache-busted `assets/<name>.js` URL)

**Consumers**: `snippets/utility--core-assets.liquid` — called once at stage 3 of the head pipeline

## Purpose

Emits the page's `<script type="importmap">` declaring the theme's ES module specifiers. Each name in the internal `module_list` becomes the specifier `@theme/<name>` resolving to `assets/<name>.js` (cache-busted via Shopify's `| asset_url`). Consumers in `assets/*.js` files import via the specifier (`import { foo } from '@theme/utils'`) instead of relative paths, so renames of file locations don't ripple through every JS file.

The import map is the single source of truth for the theme's JS module list. Adding a new substrate JS module requires one edit here.

## API

No params. Reads its `module_list` from a literal `assign` inside the snippet.

## Output shape

```html
<script type='importmap'>
  {
    "imports": {
      "@theme/core": "…/core.js?v=…",
      "@theme/utils": "…/utils.js?v=…",
      "@theme/dom": "…/dom.js?v=…",
      "@theme/document-utils": "…/document-utils.js?v=…",
      "@theme/events-manager": "…/events-manager.js?v=…",
      "@theme/observers-manager": "…/observers-manager.js?v=…",
      "@theme/cache-manager": "…/cache-manager.js?v=…",
      "@theme/modifiers-manager": "…/modifiers-manager.js?v=…",
      "@theme/base-component": "…/base-component.js?v=…",
      "@theme/hydrate": "…/hydrate.js?v=…",
      "@theme/token-layout": "…/token-layout.js?v=…"
    }
  }
</script>
```

Empty `module_list` → no output (the `{% if module_list.size > 0 %}` guard suppresses emission).

## Behavior

- **Single source of truth for substrate JS modules.** The `module_list` is a comma-separated string split into an array:

  ```liquid
  {% assign module_list = 'core,utils,dom,document-utils,events-manager,observers-manager,cache-manager,modifiers-manager,base-component,hydrate,token-layout' | split: ',' %}
  ```

  Adding a new module appends its filename (without `.js`) to the literal string. The split + loop pattern produces one map entry per name.

- **`@theme/` namespace prefix.** All theme specifiers carry the `@theme/` scope prefix. Adopted to disambiguate from app-emitted modules and from third-party packages that might land in storefront JS via Shopify apps.
- **Flat naming.** Modules don't nest (`@theme/managers/events` is not a thing). Each module is a single file under `assets/`; the import-map specifier matches the filename.
- **Cache-busting via `| asset_url`.** Each resolved URL includes Shopify's automatic version query string. Browsers cache by full URL; a file rename or content change produces a new URL.
- **Trailing-comma defense.** The `{% unless forloop.last %},{% endunless %}` after each entry produces valid JSON — the final entry omits its comma.
- **Whitespace trim markers around control flow.** `{%-` / `-%}` on the `if` / `for` tags so the resulting JSON is compact and parser-safe (extra source whitespace would still parse but bloat the response).
- **No deduplication.** Two identical names in `module_list` would emit duplicate map entries (the latter overriding the former in browser parse). Authors maintain the list manually; no defensive guard.

## CSS

N/A — emits a `<script>` tag.

## CSS custom properties (exposed)

N/A.

## A11y

N/A — head-pipeline asset declaration.

## Locale keys

N/A — module specifiers are programmatic identifiers.

## Validation

Per `validation-contract.md` Tier 1b (substrate / utility-snippet).

- **Tier**: substrate — utility-snippet sub-shape
- **Page(s)**: every shipped page (the import map renders once per page via `utility--core-assets`).
- **API surface** (matrix to exercise):
  - `module_list` non-empty → one `<script type="importmap">` element emitted with one entry per name
  - `module_list` empty → no output (defensive guard)
  - Each map entry's URL resolves to the cache-busted `assets/<name>.js` (Shopify's `| asset_url` provides the cache-bust query string)
- **Edge cases**:
  - One of the referenced JS files missing → import map still emits the entry; the missing file's import (`import … from '@theme/<missing>'`) throws at module-load time in the browser. Out of this utility's scope; the missing-file failure mode lives in the JS module that tried to import.
  - The import map ships in `<head>` after some module preload tags (per `utility--core-assets`); browsers spec-defined behavior parses the import map before resolving any deferred module imports.
- **Visual showcase**: DevTools shows the `<script type="importmap">` element with the expected entries; the browser's Network tab shows JS modules loading via the resolved URLs.
- **Assertions** (prose; Playwright once installed):
  - `document.querySelector('script[type=importmap]')` exists exactly once per page
  - The JSON body parses to an object with an `imports` key
  - Every name in the module list resolves to a URL ending in `<name>.js` plus a Shopify cache-bust query string
- **Unit scope**: none (Liquid only).

## Implementation-time decisions

Shipped — no open decisions.

## Out of scope

- **Conditional module loading.** Every page emits the same import map. Per-template module trimming (e.g. dropping `cart` modules from non-cart pages) would require a module-tagging step and is not currently needed.
- **`scopes` map.** Import maps support a `scopes` key for path-specific specifier overrides. The theme uses one global namespace; scopes are not used.
- **External module specifiers.** The map names theme modules only. Third-party CDN modules (if added) would either ship through a separate map or be added here under their own scope.
- **Versioning / explicit pinning.** Shopify's `| asset_url` provides automatic cache-busting; explicit version pins in the map are not needed.

## Related

- `.context/specs/utility--core-assets.md` — stage-3 consumer
- `.context/specs/core.md` — the JS entry point; defines the `window.Token` namespace consumed by classic-script contexts
- `.context/rules/js-asset-convention.md` — how `@theme/<name>` specifiers are consumed inside `assets/*.js` files
