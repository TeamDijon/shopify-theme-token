# badge

**Layer**: 0
**Type**: snippet (`snippets/badge.liquid`)
**Status**: spec (not yet implemented)
**Depends on**: `snippets/icon.liquid`, semantic `theme_color` tokens (`--color-success/warning/error/info`)
**Consumers**: `product-badges` L1 block, blog category/tag pills, promo labels, status markers — any labeled pill (all planned)

## Purpose

Renders a single badge — a tone-colored pill with optional icon + label. A generic marker; all domain logic (which badges a product gets, etc.) lives in consuming blocks/sections.

## API

| Arg | Type | Required | Notes |
|---|---|---|---|
| `label` | string | yes | Badge text. Blank → early exit |
| `tone` | string | no | Semantic tone: `neutral` (default), `success`, `warning`, `error`, `info`, `accent` |
| `icon` | string | no | Icon file_name (without `icon-` prefix), rendered before label |
| `badge_style` | string | no | `tint` (default) or `solid`. Emitted as `badge-style:<value>` modifier |

## Output shape

```html
<span class="badge" data-modifiers="tone:warning,badge-style:tint">
  {% if icon != blank %}{% render 'icon', file_name: icon %}{% endif %}
  {{ label }}
</span>
```

## CSS

Per `.context/docs/css-standards.md` — component-rooted, no BEM:

```css
.badge {
  --badge-tone: var(--color-role-foreground);

  display: inline-flex;
  align-items: center;
  gap: var(--badge-gap, 0.25rem);
  padding: var(--badge-padding, 0.125rem 0.5rem);
  border-radius: var(--badge-radius, 0.25rem);
  font-size: var(--badge-size, 0.75rem);
  font-weight: var(--badge-weight, 500);

  color: var(--badge-text-color, var(--badge-tone));
  background: var(--badge-background, color-mix(in oklab, var(--badge-tone), var(--color-role-background) 88%));

  & > svg { --icon-size: var(--badge-icon-size, 0.875rem); }

  &[data-modifiers*='tone:success'] { --badge-tone: var(--color-success); }
  &[data-modifiers*='tone:warning'] { --badge-tone: var(--color-warning); }
  &[data-modifiers*='tone:error']   { --badge-tone: var(--color-error); }
  &[data-modifiers*='tone:info']    { --badge-tone: var(--color-info); }
  &[data-modifiers*='tone:accent']  { --badge-tone: var(--color-accent); }

  &[data-modifiers*='badge-style:solid'] {
    color: var(--badge-solid-text, var(--color-role-background));
    background: var(--badge-tone);
  }
}
```

Default **tint** — tone-tinted background (12% tone over the scheme background via `color-mix`) with tone-colored text, adapting to light + dark schemes without an `-on` pair. `badge-style:solid` swaps to a solid tone fill.

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--badge-tone` | Resolved tone color (set internally per modifier) | `var(--color-role-foreground)` |
| `--badge-text-color` | Text color (tint mode) | `var(--badge-tone)` |
| `--badge-background` | Background (tint mode) | tone-tinted via `color-mix` |
| `--badge-solid-text` | Text color (solid mode) | `var(--color-role-background)` |
| `--badge-size` | Font size | `0.75rem` |
| `--badge-weight` | Font weight | `500` |
| `--badge-padding` | Padding | `0.125rem 0.5rem` |
| `--badge-radius` | Border radius | `0.25rem` |
| `--badge-gap` | Icon-label gap | `0.25rem` |
| `--badge-icon-size` | Icon size | `0.875rem` |

## Behavior

- Tone maps to a semantic color via the `tone:<value>` modifier; `neutral` falls back to `--color-role-foreground`
- Default tint style; `badge-style:solid` modifier for solid fill
- Icon optional, rendered before label via the `icon` snippet
- Early exit (`break`) when `label` is blank

## A11y

- Badge text reads natively — no special ARIA
- When a badge is redundant with other UI (e.g. "Sale" alongside a visible compare-at price), the consumer may `aria-hidden` it
- Solid mode text contrast assumes saturated tones; `--badge-solid-text` exposed for override on light tones

## Out of scope

- Badge source resolution (product tags, metafields, computed sale %, inventory) — consuming blocks/sections
- Positioning/stacking on a card — consuming container's concern
- Interactive / linked pills — that's a `chip` primitive; wrap `badge` in `<a>` at consume-site for the simple case
- Reusable named badges via a `badge` metaobject — deferred; the `label`/`tone`/`icon` API maps cleanly if it lands later

## Implementation-time decisions

- Tint vs solid default — currently tint (matches Token's tame aesthetic). Sale badges may want solid; revisit with first consumer
