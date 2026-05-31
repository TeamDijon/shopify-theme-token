# star-rating

**Layer**: 0
**Type**: snippet (`snippets/star-rating.liquid`)
**Status**: spec (not yet implemented)
**Depends on**: `snippets/icon.liquid`, `assets/icon-star.svg`, star presets in `assets/layer-theme.css` (all shipped)
**Consumers**: `rating` L1 block (primary), product-card surfaces (planned), `testimonial` block (optional rating display)

## Purpose

Single source of truth for star-rating visual treatment. Renders 5 stars from a numeric rating using the existing `full`/`half`/`empty` presets on `icon-star.svg`.

## API

| Arg | Type | Required | Notes |
|---|---|---|---|
| `rating` | number | yes | 0-5, clamped. Blank → early exit |
| `count` | number | no | Review count, rendered as adjacent text if present |

## Output shape

```html
<span class="star-rating" aria-label="…">
  {% for i in (1..5) %}
    {% render 'icon', file_name: 'star', preset: <'full'|'half'|'empty'> %}
  {% endfor %}
  {% if count %}<span class="rating-count">{{ count }}</span>{% endif %}
</span>
```

## CSS

Per `.context/docs/css-standards.md` — component-rooted, no BEM:

```css
.star-rating {
  --icon-size: var(--star-size, 1rem);  /* re-scopes icon snippet's sizing */

  & > svg { color: var(--star-color, inherit); }
  & .rating-count {
    font-size: var(--count-size, 0.875rem);
    color: var(--count-color, var(--color-role-foreground-secondary));
  }
}
```

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--star-size` | Star inline/block size (re-scoped to `--icon-size` internally) | `1rem` |
| `--star-color` | Star color | inherits from `color` on consumer |
| `--count-size` | Review count font size | `0.875rem` |
| `--count-color` | Review count text color | `var(--color-role-foreground-secondary)` |

## Behavior

- Per-star preset resolution: `rating >= i` → `full`; `rating >= i - 0.5` → `half`; else `empty`
- Container is `<span>` (inline-level), can sit inside flowing text
- Visual resolves to 0.5-star increments; `aria-label` carries the precise unrounded rating for screen readers
- A11y: container `aria-label` from `accessibility.star_rating` locale key; individual SVGs already `aria-hidden` via `icon` snippet
- Early exit (`break`) when `rating` is blank

## Locale keys to add

- `accessibility.star_rating` — `"{{ rating }} out of 5 stars{{ count_suffix }}"`
- `accessibility.star_rating_count_suffix` — `", based on {{ count }} reviews"` (interpolated only when count present)

## Implementation-time decisions

- Count rendering format — plain number, or wrapped/translated label. Decide when the first consumer (`rating` block) lands.

## Out of scope

- JS update path for variant changes — rating is product-level, not variant-level
- Interactive star-picker for review submission — separate snippet if ever needed
- Sub-0.5 visual precision — half-star is the shipped resolution
