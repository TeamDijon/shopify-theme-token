# Dynamic style pattern

Per-instance CSS values (widths, spacings, colors from settings) live in CSS custom properties scoped to a component instance. `snippets/utility--dynamic-style.liquid` handles the scoping.

## The flow

1. **Compute a `base_selector`** — uniquely identifies the instance in the DOM. Use `utility--base-selector` for blocks; for sections use `'shopify-section-' | append: section.id`.
2. **Capture CSS declarations** — guard each line so blank settings don't emit empty properties.
3. **Render `utility--dynamic-style`** passing `base_selector` + `css_content`. The utility wraps the content in `#<selector> { ... }` and injects it via the asset loader.
4. **Consume the properties in the component's stylesheet** via `var(--name, fallback)`.

## Example

```liquid
{% capture dynamic_style %}
  {% if content_width and content_width != blank %}
    --content-width: {{ content_width.width.value }}px;
  {% endif %}
  {% if desktop_margin_block_start and desktop_margin_block_start > 0 %}
    --desktop-margin-block-start: {{ desktop_margin_block_start | divided_by: 16.0 | round: 3 }}rem;
  {% endif %}
{% endcapture %}
{% render 'utility--dynamic-style', base_selector: base_selector, css_content: dynamic_style %}
```

```css
.shopify-block--button {
  max-inline-size: var(--content-width, none);
  margin-block-start: var(--desktop-margin-block-start, 0rem);
}
```

## Rules

- **Guard every declaration** — wrap each line in a conditional so blank settings don't emit empty custom properties.
- **Always provide a CSS fallback** — `var(--x, 0rem)`, not bare `var(--x)`. Components must work when the setting is absent.
- **Convert px → rem for spacing** — use `| divided_by: 16.0 | round: 3`. Settings authored in px (range inputs), CSS values expressed in rem.
- **Scope covers the subtree** — descendants inherit the custom properties, so a component can pass dynamic values into child snippets without re-scoping.

## Related

- `snippets/utility--dynamic-style.liquid` — the renderer
- `snippets/utility--base-selector.liquid` — the selector source for blocks
