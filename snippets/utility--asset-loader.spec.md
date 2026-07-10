# utility--asset-loader

**Layer**: substrate

**Type**: utility-snippet (`snippets/utility--asset-loader.liquid`)

**Status**: shipped

**Implementation**: `snippets/utility--asset-loader.liquid` v1.5.0 (per-channel strategy emitter)

**Reconciled**: 2026-06-05

**Reviewed**: 2026-06-05

**Depends on**:
- `snippets/utility--css-minifier.liquid` (downstream — minifies `css_content` strings inlined via `css: 'inline'`)
- `snippets/utility--inline-asset.liquid` (downstream — safe-wrapper resolver used when the loader inlines a named asset file)

**Consumers**:
- `snippets/utility--core-assets.liquid` — called 3 times to orchestrate the head pipeline (core layers inline + core.js preload + dynamic-style inline)
- `snippets/utility--dynamic-style.liquid` (transitively — its captured CSS routes through this loader as `css: 'inline'`)
- Any future specialized section that ships its own `assets/<name>.css` + `assets/<name>.js` pair and needs strategy choice (`link` / `inline` / `module` / `preload`)

## Purpose

The single asset emission point for the theme. One call picks a strategy per channel (CSS / JS) and emits the matching `<style>` / `<link>` / `<script>` tag(s). Centralizing the strategy choice lets the rest of the theme call `utility--asset-loader` without knowing the dispatch rules — the loader holds the file-vs-inline / link-vs-preload / minifier-routing decisions.

The strategy catalog (`link` / `inline` / `false` for CSS; `module` / `preload` / `inline` / `false` for JS) lives in `.context/docs/asset-loading.md`; this spec defines the API + dispatch logic.

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `name` | string | conditional | — | Component name. Resolves to `assets/<name>.css` and `assets/<name>.js`. Required for `link` / `module` / `preload` strategies; optional for `inline` (use `<channel>_content` instead). |
| `css` | string \| false | no | `'link'` | `'link'` / `'inline'` / `false` (skip). Default chain uses `allow_false: true`. |
| `js` | string \| false | no | `'module'` | `'module'` / `'preload'` / `'inline'` / `false` (skip). Default chain uses `allow_false: true`. |
| `css_content` | string | no | — | Arbitrary CSS string used with `css: 'inline'` when `name` is blank. Routes through `utility--css-minifier`. |
| `js_content` | string | no | — | Arbitrary JS string used with `js: 'inline'` when `name` is blank. Emitted verbatim — no minification, no transformation. |

The `css` / `js` params accept the literal `false` (not the string `"false"`). The default chain (`assign css = css | default: 'link', allow_false: true`) preserves an explicit `false` argument. Theme-check's `ValidDocParamTypes` rejects the union type `string|boolean` so the `@param` block lists `string` — runtime behavior is correct; the type annotation is a downgrade for IDE compatibility.

Both channels `false` triggers `break` — no output.

## Output shape

Per the dispatch matrix:

| `css` | `name` | `css_content` | Output |
|---|---|---|---|
| `'link'` | non-blank | — | `<link rel="stylesheet" href="…/<name>.css?…">` (via Liquid's `stylesheet_tag` filter) |
| `'inline'` | — | non-blank | Minified `<style>…</style>` via `utility--css-minifier` |
| `'inline'` | non-blank | blank | `<style>{{ <name>.css contents }}</style>` via `utility--inline-asset` (no extra minification — Shopify's asset pipeline already minified the file) |
| `false` | — | — | Nothing |

| `js` | `name` | `js_content` | Output |
|---|---|---|---|
| `'module'` | non-blank | — | `<script type="module" src="…/<name>.js?…"></script>` |
| `'preload'` | non-blank | — | `<link rel="modulepreload" fetchpriority="high" href="…">` + `<script type="module" src="…"></script>` |
| `'inline'` | — | non-blank | `<script>{{ js_content }}</script>` verbatim |
| `'inline'` | non-blank | blank | `<script>{{ <name>.js contents }}</script>` via `utility--inline-asset` |
| `false` | — | — | Nothing |

CSS output is emitted first, then JS output. The two channels render independently — both can fire on one call.

## CSS

N/A — utility-snippet emitting `<style>` / `<link>` / `<script>` tags; no CSS rules of its own.

## CSS custom properties (exposed)

N/A — the utility wires asset references into the document head; it does not own variables.

## Behavior

- **Default chain with `allow_false: true`.** `css` defaults to `'link'` unless explicitly `false`. `js` defaults to `'module'` unless explicitly `false`. The `allow_false: true` option on `| default` preserves the literal `false` argument that callers pass to skip a channel.
- **Both channels `false` → early `break`.** Callers using the utility to emit JS-only (or CSS-only) skip the other channel explicitly; both-false is a no-op safety net.
- **Inline asset path uses `utility--inline-asset`, not raw `| inline_asset_content`.** Missing assets emit nothing (empty `<style>` / `<script>` is suppressed via the `css_content != blank` / `js_content != blank` guards after the capture). The raw `inline_asset_content` filter emits a literal `<!-- … -->` comment on error; piping through `utility--inline-asset` translates the error case into blank output, which the post-capture guard then suppresses.
- **Inline JS is emitted verbatim — no minification.** Auto-minifying inline JS risks breaking ASI and corrupting comments; the `js_content` path emits exactly the captured string.
- **Inline-from-file CSS is NOT routed through the minifier.** Shopify's asset pipeline already minifies CSS files; running the minifier on top adds ~6% savings but risks correctness on its token-collapse / comment-strip passes. The `css: 'inline' + name` path uses `utility--inline-asset` directly, no minifier; the `css: 'inline' + css_content` path (Liquid-captured dynamic CSS) does route through `utility--css-minifier` since Liquid-captured strings carry source-line whitespace.
- **`stylesheet_tag` / `script_tag` are Shopify-built-in filters.** Their output carries the cache-busted asset URL (Shopify appends `?v=…` automatically). `script_tag` defaults to `type="text/javascript"`; the loader patches it to `type="module"` via `| replace`.
- **`name` resolution is convention-based.** `name: 'hero-section'` always maps to `assets/hero-section.css` + `assets/hero-section.js`. The loader never resolves to anything else — sibling assets (icons, images, fonts) load through their own dedicated utilities.

## A11y

N/A — utility emits asset references; no DOM, no a11y surface.

## Locale keys

N/A — no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1b (substrate / utility-snippet).

- **Tier**: substrate — utility-snippet sub-shape
- **Page(s)**: covered indirectly by every page that renders `utility--core-assets` (every page that selects either layout). The asset-loader's behavior is observable through the rendered `<head>` content — `<link>` / `<style>` / `<script>` tags.
- **API surface** (matrix to exercise):
  - `name + css: 'link'` → `<link rel="stylesheet">` with cache-busted URL
  - `name + css: 'inline'` → `<style>…</style>` with file contents, no minifier
  - `css_content (no name) + css: 'inline'` → `<style>…</style>` with minified content
  - `name + js: 'module'` → `<script type="module">` (no `type="text/javascript"`)
  - `name + js: 'preload'` → `<link rel="modulepreload">` + `<script type="module">`
  - `js_content + js: 'inline'` → `<script>…</script>` verbatim
  - `css: false, js: false` → empty output
- **Edge cases**:
  - `css: 'inline' + name + css_content` both present → the `css_content` path wins (precedence order in the if/elsif chain)
  - `js: 'preload'` without `name` → no output for JS channel
  - Missing asset file inlined via `name + 'inline'` → blank output (suppressed by the post-capture guard)
- **Visual showcase**: every shipped page implicitly exercises the loader via `utility--core-assets`. DevTools confirms the expected tag sequence.
- **Assertions** (prose; Playwright once installed):
  - `core.js` loads as `type="module"` with `rel="modulepreload"` ahead of the script tag
  - Inline `<style>` blocks emitted via `css_content` show no `/* … */` comments and collapsed whitespace
  - Inline `<style>` blocks emitted via `name + 'inline'` retain Shopify's pre-minified content unchanged
- **Unit scope**: none (Liquid only).

## Implementation-time decisions

Shipped — no open decisions.

## Out of scope

- **Strategy catalog rationale.** Which strategy to pick when lives in `.context/docs/asset-loading.md`. This spec defines the API + dispatch only.
- **Asset-naming alternatives.** `name` maps mechanically to `assets/<name>.css` / `assets/<name>.js`. Cross-bundle naming (loading `bundle.<name>.css`, versioned filenames) is out of scope — Shopify's asset pipeline handles cache busting.
- **Per-call minification opt-out for inline `css_content`.** The Liquid-captured inline-CSS path always minifies. Bypassing the minifier for a single call would require a new param; current call sites all benefit from minification.
- **Late-loading / deferred / async scripts.** JS strategies are `module` (defers naturally) and `preload`. `async` / `defer` attributes are not exposed — module scripts already defer parsing.
- **Multi-name / array calls.** One call emits one component's assets. Looping is the caller's responsibility (see `utility--core-assets`).

## Related

- `.context/docs/asset-loading.md` — strategy catalog, file-vs-inline decision rule, JS-specific footguns (classic-script context inside `{% javascript %}` blocks)
- `utility--inline-asset.spec.md` — safe wrapper around `| inline_asset_content`
- `utility--css-minifier.spec.md` — the Liquid-captured-CSS minification path
- `utility--core-assets.spec.md` — the orchestrator using this loader 3 times in sequence
