# Asset loading

The theme ships CSS and JS for each component through `snippets/utility--asset-loader.liquid`. A single call picks a strategy per channel:

```liquid
{% render 'utility--asset-loader', name: 'hero-section', css: 'link', js: 'module' %}
```

`name` resolves to `assets/<name>.css` and `assets/<name>.js`. You can also bypass `name` and pass raw `css_content` / `js_content` strings to inline dynamic output.

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
