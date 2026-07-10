# utility--css-minifier

**Layer**: substrate

**Type**: utility-snippet (`snippets/utility--css-minifier.liquid`)

**Status**: shipped

**Implementation**: `snippets/utility--css-minifier.liquid` v2.0.0 (Liquid-captured-CSS minifier)

**Reconciled**: 2026-06-05

**Reviewed**: 2026-06-05

**Depends on**: none — leaf utility

**Consumers**:
- `snippets/utility--asset-loader.liquid` — every `css: 'inline' + css_content` path routes through this minifier (so every dynamic-style emission via `utility--dynamic-style` is minified)
- `snippets/utility--core-assets.liquid` (transitively) — both stage-1 (concatenated layers) and stage-2 (font faces + variables) inline blocks pass through this minifier via the asset-loader

## Purpose

The minifier for Liquid-captured CSS. Three passes over the input: whitespace collapse, `/* … */` comment strip, and selector / declaration token collapse. Wraps the result in a `<style>` tag. Returns nothing when input is blank.

The minifier targets Liquid-captured CSS specifically — content composed at render time by snippets emitting `assign` / `echo` declarations with source-line whitespace. CSS files in `assets/` are pre-minified by Shopify's asset pipeline; the asset-loader applies the minifier only to the captured-string path, not the inline-from-file path.

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `css_content` | string | yes | — | The CSS to minify. Blank → no output. |

Output: `<style>{minified css}</style>` or nothing.

## Output shape

```liquid
{% capture css_content %}
  .shopify-block--button {
    color: var(--color-role-primary-button-text);
    /* honor the picked button-style variant */
    background: var(--color-role-primary-button);
  }
{% endcapture %}

{% render 'utility--css-minifier', css_content: css_content %}
```

Renders:

```html
<style>.shopify-block--button{color:var(--color-role-primary-button-text);background:var(--color-role-primary-button)}</style>
```

## CSS

N/A — utility-snippet emitting a `<style>` tag; no per-component CSS rules.

## CSS custom properties (exposed)

N/A.

## Behavior

### Pass 1 — whitespace collapse

```
css_content | strip_newlines | split: ' ' | join: ' '
```

Removes newlines, then collapses any run of whitespace (spaces, tabs, indentation) into single spaces by relying on `split: ' '`'s Ruby-inherited special-case (any whitespace acts as separator, empty splits dropped). The `squish` filter does not function in this Liquid runtime — using `split: ' ' | join: ' '` is the documented working alternative per `.context/rules/liquid-filter-gotchas.md`.

### Pass 2 — block-comment strip

```
... | split: '*/'
for chunk in chunks
  echo chunk | split: '/*' | first | strip
endfor
```

For each `*/`-delimited chunk, drop the `/* … ` half by taking the first slice of `chunk | split: '/*'`. Removes block comments inline; no regex needed.

Inline `//` line comments are not stripped — they're not valid CSS. Liquid-captured CSS uses `/* … */` exclusively.

### Pass 3 — token collapse

Seven targeted `| replace` passes against the whitespace-collapsed, comment-stripped result:

| Pattern | Replacement | Targets |
|---|---|---|
| `'; '` | `';'` | Space after declaration terminator |
| `'} '` | `'}'` | Space after closing brace |
| `'{ '` | `'{'` | Space after opening brace |
| `' {'` | `'{'` | Space before opening brace |
| `': '` | `':'` | Space after declaration colon |
| `';}'` | `'}'` | Trailing semicolon before closing brace |
| `') ;'` | `');'` | Space before semicolon following close-paren (e.g. `calc()` results) |

Safe under the theme's authoring conventions: `data-modifiers` values use the unspaced `key:value` form (per `modifiers-manager.spec.md`), and no Liquid-captured CSS authors multi-space inside string values. The token collapse is brittle to those conventions changing — any CSS string-literal containing `; ` or `} ` would corrupt under the pass.

### Final emission

```
style
  echo minified_css
endstyle
```

Wraps the result in a `<style>` tag via Liquid's built-in `style` block (equivalent to `{% style %}{{ minified_css }}{% endstyle %}`, emitting `<style data-shopify>…</style>` — Shopify's `data-shopify` attribute is added automatically).

### Other behavior

- **Blank `css_content` → no output.** Early `break`; no empty `<style>` tag emission.
- **Not for use on `inline_asset_content` output.** Asset files (loaded via `utility--inline-asset`) are already minified by Shopify's asset pipeline. The asset-loader bypasses this minifier on the file path.

## A11y

N/A — utility emitting CSS; no DOM, no a11y surface.

## Locale keys

N/A — no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1b (substrate / utility-snippet).

- **Tier**: substrate — utility-snippet sub-shape
- **Page(s)**: every page renders an `inline_style` block through this minifier (every `utility--dynamic-style` consumer + the dynamic-style stage in `utility--core-assets`).
- **API surface** (matrix to exercise):
  - Multi-line, indented input → output is single-line, no leading/trailing whitespace
  - Input with `/* … */` block comments → comments stripped
  - Input with declaration-terminator spaces → spaces collapsed
  - Input with selector / brace spaces → spaces collapsed
  - Blank input → no output
- **Edge cases**:
  - Input ending with `; }` → collapses to `}`
  - Input with `calc(… )` syntax → collapses parentheses spacing
  - Input with `/*` substring inside a CSS string value (no current use case) → would be incorrectly treated as comment start; out of scope
  - Input with newlines inside CSS string values (no current use case) → `strip_newlines` would corrupt; out of scope
- **Visual showcase**: every rendered page's inline `<style>` blocks are the showcase. No dedicated surface.
- **Assertions** (prose; Playwright once installed):
  - Inline `<style>` blocks contain no `/* … */` comments
  - Inline `<style>` blocks contain no double spaces, no leading/trailing whitespace, no newlines outside of selector / declaration order
  - The output `<style>` carries Shopify's `data-shopify` attribute
- **Unit scope**: none (Liquid only).

## Implementation-time decisions

Shipped — no open decisions.

## Out of scope

- **Selector deduplication / merging.** The minifier touches whitespace and comments, not selector structure. Two identical rule blocks emit twice.
- **Property deduplication.** Last-declaration-wins is CSS-native cascade behavior; the minifier doesn't reorder or drop overridden declarations.
- **Vendor-prefix handling.** Authors emit canonical CSS; vendor prefixes are out of scope.
- **Source maps.** Inline minified CSS has no source mapping; debugging happens in the Liquid source.
- **CSS Custom Properties whitespace.** Custom property values can legitimately contain commas, spaces, parens. The token-collapse pass is intentionally conservative — it does not touch space inside property values, only space around structural tokens (`{`, `}`, `;`, `:`).
- **Asset-pipeline file minification.** `inline_asset_content` output is not run through this minifier — Shopify pre-minifies asset files, and re-running the token-collapse pass over already-minified CSS courts edge-case regressions for negligible byte savings.

## Related

- `utility--asset-loader.spec.md` — primary consumer; routes the `css: 'inline' + css_content` path through this minifier
- `utility--core-assets.spec.md` — orchestrates two inline blocks both passing through this minifier
- `utility--dynamic-style.spec.md` — per-instance CSS scoping; its content flows through the asset-loader and minifier
- `.context/rules/liquid-filter-gotchas.md` — names the `squish` non-functioning behavior this minifier worked around
