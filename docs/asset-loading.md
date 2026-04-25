# Asset loading

The theme ships CSS and JS for each component through `snippets/utility--asset-loader.liquid`. A single call picks a strategy per channel:

```liquid
{% render 'utility--asset-loader', name: 'hero-section', css: 'link', js: 'module' %}
```

`name` resolves to `assets/<name>.css` and `assets/<name>.js`. You can also bypass `name` and pass raw `css_content` / `js_content` strings to inline dynamic output.

## Where do the CSS/JS files live?

Upstream of the loading strategies below: should the styles/scripts be a separate file in `assets/`, or co-located with the Liquid via `{% stylesheet %}` / `{% javascript %}` blocks? The answer depends on the consumer:

| Consumer | CSS lives in | JS lives in |
|---|---|---|
| **Section** (`sections/<name>.liquid`) | `assets/<name>.css`, loaded via `utility--asset-loader` | `assets/<name>.js` (specialized sections; standard sections rarely need their own JS) |
| **Renderable snippet / block / other reusable piece** | `{% stylesheet %}` block inside the file | `{% javascript %}` block inside the file |
| **Per-instance dynamic styles** (Liquid-computed values) | Inline via `utility--dynamic-style`, regardless of consumer type | n/a — runtime mutation lives in the component's JS class via the modifiers manager |

Rationale: sections are big enough to deserve their own asset bundles and benefit from the asset-loader's strategy options. Renderable snippets and blocks are small reusable pieces that travel best with their markup — Shopify deduplicates `{% stylesheet %}` / `{% javascript %}` content per page, so these blocks stay self-contained. Dynamic per-instance CSS is always inline because the values come from Liquid at render time.

The three rows aren't mutually exclusive: a section with `assets/<name>.css` can also use `utility--dynamic-style` for per-instance variables. Pure utility snippets (`utility--*`) generally don't carry stylesheet blocks at all — they emit head content, attributes, or JSON, not visible markup.

**JS-specific footgun**: `{% javascript %}` blocks run in classic-script context, not as ES modules. ES syntax (`import` / `export`) is unavailable inside them. Blocks and snippets needing functionality from `core.js`-registered modules access them via the `window.theme` namespace (`js-asset-convention.md` documents this affordance). ES module imports are only available in `assets/<name>.js` files loaded via `utility--asset-loader` with `js: 'module'` — that's the structural reason a block would graduate to a paired asset file (rare; revisit case-by-case).

## CSS strategies

| Strategy | Emits | Use when |
|---|---|---|
| `link` (default) | `<link rel="stylesheet" href="<name>.css">` | Non-critical component CSS loaded from `assets/`. The browser's built-in caching and parallel download handle it. |
| `inline` | `<style>minified CSS</style>` | Critical-path CSS (theme base, fold content) or dynamically composed CSS (settings-derived variables, per-instance styles). Inline content runs through `utility--css-minifier`, which strips `/* */` comments and collapses whitespace. |
| `false` | (nothing) | Component ships JS only, or CSS is handled elsewhere. |

## JS strategies

| Strategy | Emits | Use when |
|---|---|---|
| `module` (default) | `<script type="module" src="<name>.js">` | Standard component JS. ES module, parser-blocks lightly, defers execution until parsing finishes. |
| `preload` | `<link rel="modulepreload" fetchpriority="high" href="<name>.js">` + `<script type="module" src="<name>.js">` | Critical-path modules you want in-flight as early as possible — typically the theme's `core.js`. The preload starts the fetch immediately; the module tag executes it in order. |
| `inline` | `<script>inline JS</script>` | Small, critical-path scripts that must run before external JS finishes loading. Inline JS is emitted **as-is** — it is NOT minified or stripped of newlines (ASI and `//` comments would break). Keep inline JS short and comment-free, or wrap it in an IIFE. |
| `false` | (nothing) | Component ships CSS only. |

## Defaults are opinionated

A call with just `name` ships both channels: `css: 'link', js: 'module'`. If the component is CSS-only or JS-only, pass `false` explicitly.

```liquid
{% render 'utility--asset-loader', name: 'hero-section', js: false %}     {% # CSS only %}
{% render 'utility--asset-loader', name: 'product-form', css: false %}    {% # JS only %}
```

## Content mode vs name mode

You can inline content that wasn't authored as a file:

```liquid
{% capture dynamic_style %}
  :root { --accent: {{ settings.accent }}; }
{% endcapture %}
{% render 'utility--asset-loader', css: 'inline', css_content: dynamic_style, js: false %}
```

When both a `name` and a `*_content` are passed with `inline`, the content takes precedence.

## Gotchas

- **Inline CSS goes through `utility--css-minifier`.** The minifier is regex-ish — it strips `/* */` comments and collapses whitespace around CSS syntax tokens. Avoid `content: "  "` strings with significant internal whitespace; the minifier may collapse them.
- **Inline JS is raw.** No minification, no newline stripping. This is deliberate — stripping would risk ASI changes and `//` comment fusion. Size-optimize the source instead.
- **`modulepreload` only pays off for top-of-page scripts** whose execution blocks the first meaningful render. For section-level JS, default `module` is fine.

## Related

- `snippets/utility--asset-loader.liquid` — the orchestrator
- `snippets/utility--css-minifier.liquid` — inline CSS pipeline
- `snippets/utility--core-assets.liquid` — top-level callsite; wires `core.js`/`core.css` + dynamic styles + import map
- `snippets/utility--import-map.liquid` — module specifier resolution
