---
paths:
  - "snippets/*.liquid"
---

# Snippet convention

Every snippet in `snippets/*.liquid` follows this structure.

## Structure (in order)

1. **Version header comment** — `{% # <Name> vX.Y.Z %}`
   - Human-readable name matching the file purpose
   - Bump patch for fixes, minor for additive changes, major for breaking param changes

2. **Changelog block** — `{% comment %}` with interface changes (see "Changelog" below). Omit on v1.0.0 only; required from any subsequent version.

3. **`{% doc %}` block**
   - `@description` — concise purpose. One line when possible; multi-line (with structure — numbered steps, `Depends on:` callouts, etc.) when the description naturally warrants it. Keep it meaningful — the doc block is cheap but important.
   - `@param {type} [name] - <description>` — one line per param. Types: `string`, `boolean`, `number`, `metaobject`, `section`, `block`, `object`. Brackets `[name]` mark optional params. Describe default and blank-behavior.
   - `@example {% render '<name>', ... %}` — at least one usage. Multiple allowed for variants.

4. **Logic block** — `{% liquid %}` for assign/capture/control flow. Resolve each param with a `| default:` chain: explicit arg → `block.settings.x` → literal default. Early-exit with `break` when a required input is blank (works outside `for` blocks; chosen over `continue` for "escape this snippet" semantics).

5. **Output** — HTML markup, followed by optional `{% stylesheet %}` and/or `{% javascript %}` blocks scoped to `.shopify-block--<name>` or the component's root class. See `.context/docs/asset-loading.md` for the file-vs-inline decision rule (renderable snippets inline; pure `utility--*` snippets typically don't carry style/script blocks).

## Changelog

See `.context/docs/versioning-and-changelog.md` for format and policy.

- Location: `{% comment %}` block between the version header and the `{% doc %}` block
- Interface-change trigger: new/removed/renamed params, changed defaults, behavior changes

## Naming

- `utility--<name>.liquid` — internal helper that outputs head content, metadata, or attributes. Never visible body DOM. Examples: `utility--language` (emits `lang`/`dir`), `utility--open-graph` (emits `<meta>`), `utility--css-variables` (emits captured CSS).
- `<name>.liquid` — renderable component that outputs visible body DOM. Either:
  - Paired with a matching `blocks/<name>.liquid` that consumes it (e.g. `button`, `icon`, `richtext`), or
  - Rendered directly from a layout, section, or another snippet when no merchant-editable block fits (e.g. `skip-to-content` — a fixed accessibility helper called from `layout/theme.liquid`).

## Example

```liquid
{% # Button v1.2.0 %}

{% comment %}
  Changelog
  - v1.2.0 — add `icon` param (optional)
  - v1.1.0 — add `open_in_new_tab` param (default: false)
  - v1.0.0 — initial
{% endcomment %}

{% doc %}
  @description Renders a customizable button element with link support.

  @param {section} [section] - The section containing the block
  @param {block} [block] - Block object containing the settings
  @param {string} [content] - Button label. No render if blank.
  @param {string} [link] - URL. Renders as <button> if blank.

  @example {% render 'button', section: section, block: block %}
  @example {% render 'button', content: 'Click me', link: '/contact' %}
{% enddoc %}

{% liquid
  assign content = content | default: block.settings.content
  if content == blank
    break
  endif
  assign link = link | default: block.settings.link
%}

<button class="shopify-block shopify-block--button">
  {{ content }}
</button>

{% stylesheet %}
  .shopify-block--button { ... }
{% endstylesheet %}
```

## Related

- Modifier system (for `data-modifiers` attributes): `.context/docs/modifier-system.md`
