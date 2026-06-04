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

## Skip-on-default + var-fallback cascade

The two rules above (guard each declaration; always fallback in `var()`) compose into a multi-layer cascade resolved by the CSS engine, not by Liquid. Every per-instance customization surface in the theme uses this shape: a layer that has *no input* emits *no declaration*, and consumers chain `var(--upper, var(--lower, <floor>))` to flow through layers transparently.

### Worked example — per-block top margin

Four layers resolve through one consumer-side `var()` chain:

| Layer | Source | Emission |
|---|---|---|
| 1 — Per-block override | `block.settings.mobile_margin_block_start` (px range) | `--mobile-margin-block-start: <rem>` only when `> 0` |
| 2 — Section block-rhythm | `section.settings.block_rhythm` (spacing metaobject picker) | `--block-rhythm: var(--spacing-<picked-handle>)` per-section |
| 3 — Substrate default | `assets/layer-base.css` | Seeds `--spacing-xs/sm/md/lg/xl` rem defaults |
| 4 — Hardcoded floor | `assets/layer-theme.css`'s cascade rule | `var(--mobile-margin-block-start, var(--block-rhythm, 0rem))` |

The consumer rule lives in `layer-theme.css`:

```css
[data-modifiers*='theme-root'] > .shopify-block:not(:first-child) {
  margin-block-start: var(--mobile-margin-block-start, var(--block-rhythm, 0rem));
}
```

Resolution scenarios:

- **Block override + section rhythm**: layer 1 emits → first `var()` resolves → block override wins
- **No block override + section rhythm**: layer 1 skipped → first `var()` unset → falls through to `--block-rhythm` → section rhythm wins
- **No block override + no section rhythm**: both unset → falls through to `0rem` floor
- **Block override is `0` or blank**: skipped (the `> 0` guard treats `0` same as blank) → falls through to section rhythm. To force-zero, the merchant picks an explicit `spacing: none` handle at the section level — which emits `--block-rhythm: 0px`.

### The three commitments this names

1. **Emit only on real input** — the utility guards `if value > 0` (or `if != blank`); a `0` or blank produces no declaration. Don't emit `--x: ;` or `--x: 0` from a blank input.
2. **Layer below carries a `var()` fallback** — each consumer reads `var(--upper, <fallback-chain>)`. The fallback is the layer below, not a hardcoded value (unless this is the floor).
3. **The hardcoded floor is the last fallback in the chain** — never silently substituted inside the utility. The consumer's `var()` chain is the canonical place the floor appears.

### When to reach for it

Every per-instance customization surface — gap, padding, margin, content-width, container variant, future per-block typography overrides. The pattern lets future utilities add new layers (a new substrate default; a new per-instance override) without restructuring existing consumers — the `var()` chain absorbs the new layer wherever it slots in.

## Per-iteration custom properties (loop-emitted variables)

When a Liquid loop produces N elements and CSS needs a Liquid-derived value per element — but the value isn't expressible via `attr()` and the per-instance flow above doesn't fit because the loop runs outside any single block's render — emit a single inline `<style>` block that sets a CSS custom property per element keyed by id. Each element's CSS then reads it via `var(--name)`.

**Worked example** — `snippets/validation--block-labels.liquid` (used by all 9 block-validation pages) needs each rendered block's merchant-facing short id as a CSS-readable label. Shopify wraps block ids in `<random>__<key>` and `section.blocks[i].id` further appends a `-1` instance suffix that gets stripped at render — neither is substringable in pure CSS, so Liquid does the trimming once and hands the clean string to CSS via a variable:

```liquid
{%- capture per_block_label_css -%}
  {%- for entry in section.blocks -%}
    {%- assign id_size = entry.id | size -%}
    {%- assign trim_size = id_size | minus: 2 -%}
    {%- assign rendered_id = entry.id | slice: 0, trim_size -%}
    {%- assign short_label = rendered_id | split: '__' | last -%}
    #shopify-block-{{ rendered_id }} { --block-label: '{{ short_label }}'; }
  {%- endfor -%}
{%- endcapture -%}
<style>{{ per_block_label_css | strip }}</style>
```

Then in the consumer page's stylesheet:

```css
.shopify-block--spacer::before {
  content: var(--block-label, '');
}
```

**When to reach for it.** Use when CSS needs a Liquid-derived per-element value (computed labels, sort-position-driven offsets, conditional per-item content) AND `attr()` and the per-instance flow above don't fit. The loop emits one `<style>` block scoped to specific ids — not a generic class-level rule, so the cost is linear with N and the rules don't cascade beyond their targets. Heavier than the per-instance flow; only reach for it when those tools aren't enough.

## Related

- `snippets/utility--dynamic-style.liquid` — the renderer
- `snippets/utility--base-selector.liquid` — the selector source for blocks
- `snippets/utility--block-layout-vars.liquid` + `.context/specs/utility--block-layout-vars.md` — the skip-on-default + var-fallback cascade worked example (per-block top margin + content-width)
- `snippets/validation--block-labels.liquid` — the loop-emitted-variables worked example
