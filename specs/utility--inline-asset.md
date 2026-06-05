# utility--inline-asset

**Layer**: substrate

**Type**: utility-snippet (`snippets/utility--inline-asset.liquid`)

**Status**: shipped

**Implementation**: `snippets/utility--inline-asset.liquid` v1.0.0 (safe `inline_asset_content` wrapper)

**Reconciled**: 2026-06-05

**Reviewed**: pending

**Depends on**: Liquid's `inline_asset_content` filter (Shopify-built-in)

**Consumers**:
- `snippets/utility--asset-loader.liquid` — inline-from-file paths route through this wrapper
- `snippets/utility--core-assets.liquid` — captures each of the four `layer-*.css` files via this wrapper
- `snippets/icon.liquid` — captures `assets/icon-<name>.svg` via this wrapper

## Purpose

The safe wrapper around Liquid's `inline_asset_content` filter. The raw filter has two unsafe behaviors: it crashes Liquid execution on blank input, and it emits a literal `<!-- inline_asset_content: <error> -->` comment when the asset is missing or its extension is unsupported. The comment is harmless inside `<style>`, breaks ES module parsing inside `<script>`, and renders empty inside `<svg>`. This wrapper translates both failure modes into blank output, suppressed by the consumer's downstream blank-check.

Always prefer this utility over raw `| inline_asset_content`. Direct use of the raw filter is an authoring smell.

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `asset_name` | string | yes | — | Asset filename to inline (e.g. `core.css`, `icon-chevron.svg`, `layer-base.css`). Blank → empty output. Asset-resolution errors → empty output. |

Output: the asset's contents verbatim, or nothing.

## Output shape

```liquid
{% capture css %}
  {% render 'utility--inline-asset', asset_name: 'core.css' %}
{% endcapture %}
```

`css` carries the file contents on success, empty string on failure (missing file, unsupported extension, blank input).

The snippet uses whitespace trim markers (`{%-` / `-%}`) on its structural tags. Without them, captured output gains 5 newlines from the snippet's own source-file structure that leak into `<style>`, `<svg>`, etc.

## CSS

N/A — utility-snippet inlining file contents; no CSS rules.

## CSS custom properties (exposed)

N/A.

## Behavior

- **Blank `asset_name` → empty output.** Early `break`; the raw filter would crash.
- **Asset-resolution error → empty output.** Detected by substring match `result contains '<!-- inline_asset_content:'`. Raw filter's error format is the substring `<!-- inline_asset_content: <message> -->` — checking for the prefix catches every error variant (missing asset, unsupported extension).
- **Whitespace trim markers required on structural tags.** `{%- liquid %}` ... `-%}` and `{%- doc %}` ... `-%}` on the wrapper tags. Without them the captured output carries snippet-source whitespace.
- **No transformation of content.** On success the raw filter's output is echoed verbatim. The utility is a safety wrapper, not a transformer — minification, escaping, processing happens at the consumer (e.g. `utility--css-minifier` on Liquid-captured CSS).
- **Substring match on the error sentinel is intentional.** Shopify's error comment format may carry additional context; the prefix-only check is forward-compatible against changes to the error message body.

## A11y

N/A — utility inlines file contents; no rendered DOM at this layer.

## Locale keys

N/A — pure file-content emission, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1b (substrate / utility-snippet).

- **Tier**: substrate — utility-snippet sub-shape
- **Page(s)**: covered indirectly by every page (every `utility--core-assets` call captures four `layer-*.css` files through this wrapper) and every page rendering an icon (icon snippet captures the SVG through this wrapper).
- **API surface** (matrix to exercise):
  - Existing file → output is the file's contents verbatim
  - Missing file → empty output (no `<!-- inline_asset_content: -->` comment leak)
  - Blank input → empty output (no Liquid crash)
  - Unsupported extension → empty output
- **Edge cases**:
  - Asset is empty file → output is empty string; consumer's blank-check suppresses downstream emission
  - Asset contains the literal substring `<!-- inline_asset_content:` (legitimate content) → false-positive detected as error, output suppressed. Out of scope; no current asset contains the substring.
- **Visual showcase**: every rendered page demonstrates the wrapper indirectly. A dedicated validation surface is not required.
- **Assertions** (prose; Playwright once installed):
  - First-paint `<style>` block (from `utility--core-assets`) contains the four concatenated `layer-*.css` files' contents
  - Icon SVG markup matches the source file in `assets/icon-<name>.svg`
- **Unit scope**: none (Liquid only).

## Implementation-time decisions

Shipped — no open decisions.

## Out of scope

- **Error reporting.** Failures are silent. Surfacing missing-asset names to the merchant or to the console is a higher-layer responsibility — out of this utility's scope.
- **Caching across renders.** Liquid handles asset content fetching per render; there's no cross-render cache layer in the utility.
- **Content transformation.** The wrapper is pass-through on success. Per-content-type transforms (e.g. SVG attribute normalization, CSS pre-processing) live elsewhere.

## Related

- `.context/specs/utility--asset-loader.md` — primary consumer; routes inline-from-file paths through this wrapper
- `.context/specs/utility--core-assets.md` — uses this wrapper to capture the four core CSS layers
- `.context/specs/icon.md` — uses this wrapper to capture `icon-*.svg` files
- `.context/rules/liquid-filter-gotchas.md` — sibling pattern for documenting Liquid filter unsafety
