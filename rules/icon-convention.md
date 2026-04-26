---
paths:
  - "assets/icon-*.svg"
---

# Icon convention

Icons are SVG files consumed by `snippets/icon.liquid` via `inline_asset_content`. They are styled by CSS — no color, stroke, or sizing is baked into the source.

Consumers (sections, blocks, other snippets) should always call `{% render 'icon', ... %}` rather than reading the SVG files directly. See `snippets/icon.liquid`'s doc block for the call patterns (`file_name` string or `icon` metaobject, optional `preset`).

## Filename

`icon-<name>.svg` where `<name>` is lowercase kebab-case matching the `data-name` attribute (e.g. `icon-arrow.svg` → `data-name="arrow"`, `icon-chevron.svg` → `data-name="chevron"`).

## Root `<svg>` attributes

- `xmlns="http://www.w3.org/2000/svg"` — required
- `viewBox="<min-x> <min-y> <width> <height>"` — required. No `width`/`height` attributes; sizing is controlled by CSS. The viewBox follows the icon's natural aspect ratio — commonly `0 0 50 50`, but non-square is expected (e.g. chevron is `0 0 25 50`).
- `data-name="<name>"` — must match the filename suffix
- `data-modifiers="<token>[,<token>]"` — optional. Declares how the icon renders. See the known-modifiers inventory below. Cross-reference: `.context/docs/modifier-system.md`.

The `data-preset="<preset>"` attribute is added at render time by `snippets/icon.liquid` and must NOT be present in the source SVG.

## Known root modifiers

- `fill` — the icon renders as a filled shape (paths without strokes). Used for solid glyphs like circle, square, info.
- `round` — stroked icons with rounded caps and joins.

Compose when both apply (e.g. `data-modifiers="fill,round"`).

## Shape elements

Allowed: `<path>`, `<rect>`, `<circle>`, `<ellipse>`, `<polygon>`, `<line>`, `<polyline>`. Pick the simplest element for the shape; don't convert primitives to paths unnecessarily (`icon-circle.svg` uses `<rect rx ry>`, `icon-square.svg` uses `<rect>`).

Never include:
- `fill`, `stroke`, `color`, `stroke-width`, or `style` attributes that pin appearance — color and stroke come from CSS via `currentColor` and custom properties
- `width`/`height` attributes on the root `<svg>`
- Inline `<style>` blocks

## Path-level data attributes

- `data-edge=""` — prevents stroke bleed outside the viewBox. The baseline CSS in `assets/core.css` strokes every SVG path by default (`stroke: currentcolor`, `stroke-width: 0.25rem`) and additionally applies `scale: 0.92` with `transform-origin: center` to paths carrying `data-edge`, shrinking them inward so the stroke stays inside the viewBox. Apply when the path's geometry touches or approaches a viewBox edge (e.g. arrow from `x=50`, plus spanning `0` to `50`). Omit when the path stays clear of edges (e.g. gear). No visual effect in fill-mode icons — the `data-modifiers="fill"` rule re-sets `scale: 1`.
- `data-<part>=""` — arbitrary sub-element hooks for icons with distinguishable parts addressable by CSS or JS (e.g. `data-half-star=""` on the first path of `icon-star.svg` to support partial-rating rendering). Use kebab-case. One attribute per semantic part.

## Examples

Stroked icon (arrow):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" data-name="arrow" data-modifiers="round">
  <path data-edge="" d="M 50 0 L 27 0 M 50 0 L 50 23 M 50 0 L 0 50"/>
</svg>
```

Filled icon (circle):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" data-name="circle" data-modifiers="fill">
  <rect width="50" height="50" rx="25" ry="25"/>
</svg>
```

Mixed (star with half-star part):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" data-name="star">
  <path data-edge="" data-half-star="" d="..."/>
  <path data-edge="" d="..."/>
</svg>
```
