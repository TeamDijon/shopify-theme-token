# pagination

**Layer**: 0
**Type**: snippet (`snippets/pagination.liquid`)
**Status**: spec (not yet implemented)
**Depends on**: Shopify `paginate` object (built-in). Load-more JS: future `assets/pagination.js` module (standalone, loaded by consumer section).
**Consumers**: `collection-list-page`, `search-results-page`, `blog-index`, article comment lists (all planned)

## Purpose

Single source of truth for pagination UI. One snippet, two modes: `numbered` (default, SEO-friendly anchor links) and `load-more` (button + progress text, requires JS).

## API

| Arg | Type | Required | Notes |
|---|---|---|---|
| `paginate` | object | yes | Shopify `paginate` object from `{% paginate ... %}` |
| `type` | string | no | `'numbered'` (default) or `'load-more'` |
| `window` | number | no | Numbered mode: pages shown around current. Default `2` (`±2`) |
| `aria_label` | string | no | Nav landmark label. Default: `'pagination.aria_label' | t` |

## Output shape — numbered mode

```html
<nav class="pagination" data-modifiers="type:numbered" aria-label="…">
  {% if paginate.previous %}<a class="page-link prev" rel="prev" href="{{ paginate.previous.url }}">{{ 'pagination.previous' | t }}</a>{% endif %}

  <a class="page-link" href="?page=1">1</a>
  <span class="page-ellipsis" aria-hidden="true">…</span>
  <a class="page-link" href="?page=2">2</a>
  <span class="page-link" aria-current="page">3</span>
  <a class="page-link" href="?page=4">4</a>
  <span class="page-ellipsis" aria-hidden="true">…</span>
  <a class="page-link" href="?page=12">12</a>

  {% if paginate.next %}<a class="page-link next" rel="next" href="{{ paginate.next.url }}">{{ 'pagination.next' | t }}</a>{% endif %}
</nav>
```

Current page is a `<span aria-current="page">` (not an `<a>`) — semantically and visually distinct without needing a `.current` class.

## Output shape — load-more mode

```html
<div class="pagination" data-modifiers="type:load-more">
  {% if paginate.next %}
    <button class="load-more-button" type="button"
            data-next-url="{{ paginate.next.url }}"
            data-current-count="{{ paginate.current_offset | plus: paginate.page_size }}"
            data-total-count="{{ paginate.items }}">
      {{ 'pagination.load_more' | t }}
    </button>
  {% endif %}
  <span class="pagination-progress" aria-live="polite">
    {{ 'pagination.progress' | t: shown: shown, total: paginate.items }}
  </span>
</div>
```

When `paginate.next` is blank (last page), button is omitted and progress reads `pagination.progress_complete`.

## CSS

Per `.context/docs/css-standards.md` — component-rooted, no BEM:

```css
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--pagination-gap, 0.5rem);

  & .page-link {
    color: var(--page-link-color, inherit);
    padding: var(--page-link-padding, 0.5rem 0.75rem);
    text-decoration: none;

    &[aria-current='page'] {
      color: var(--current-page-color, var(--color-role-foreground));
      font-weight: var(--current-page-weight, 600);
    }
  }

  & .page-ellipsis {
    color: var(--ellipsis-color, var(--color-role-foreground-secondary));
  }

  &[data-modifiers*='type:load-more'] {
    flex-direction: column;
    gap: var(--load-more-gap, 1rem);
  }

  & .load-more-button {
    /* inherits button styles from button block when nested, else minimal defaults */
  }

  & .pagination-progress {
    font-size: var(--progress-size, 0.875rem);
    color: var(--progress-color, var(--color-role-foreground-secondary));
  }
}
```

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--pagination-gap` | Gap between page links (numbered) | `0.5rem` |
| `--load-more-gap` | Gap between button and progress (load-more) | `1rem` |
| `--page-link-color` | Page link text color | inherits |
| `--page-link-padding` | Page link tap-target padding | `0.5rem 0.75rem` |
| `--current-page-color` | Current page indicator color | `var(--color-role-foreground)` |
| `--current-page-weight` | Current page font weight | `600` |
| `--ellipsis-color` | Ellipsis color | `var(--color-role-foreground-secondary)` |
| `--progress-size` | Progress text font size | `0.875rem` |
| `--progress-color` | Progress text color | `var(--color-role-foreground-secondary)` |

## Behavior

### Numbered mode

- Renders `paginate.previous` / `paginate.next` as edge links when available
- Always shows first and last page; collapses middle to `…` ellipses when outside `window`
- Current page is `<span aria-current="page">` (not an anchor) — semantic + non-clickable
- Page-link minimum touch target: 44×44px via padding (per a11y conventions)
- Pure HTML/CSS, no JS — links work without scripts, crawlable by bots

### Load-more mode

- Renders a `<button>` with `data-next-url` + count attrs for `pagination.js` to consume
- `pagination-progress` always renders, updated by JS as items load
- JS module (in `assets/pagination.js`, loaded by the consuming section) listens for click → fetches next URL via section-render API → appends results to the grid → updates `data-next-url` / `data-current-count` → updates progress text → removes button when `data-next-url` becomes blank
- `aria-live="polite"` on progress so screen readers announce updates

## A11y

- `<nav aria-label>` on the root — landmark for screen reader navigation
- `rel="prev"` / `rel="next"` on edge links for browser/UA hints
- `aria-current="page"` on current page (no `.current` class needed)
- `aria-hidden="true"` on ellipses (decorative)
- `aria-live="polite"` on `pagination-progress` (load-more)
- Page links meet 44×44px touch target

## Locale keys to add

- `pagination.aria_label` — `"Pagination"`
- `pagination.previous` — `"Previous"`
- `pagination.next` — `"Next"`
- `pagination.load_more` — `"Load more"`
- `pagination.progress` — `"Showing {{ shown }} of {{ total }}"`
- `pagination.progress_complete` — `"Showing all {{ total }}"`

## Implementation-time decisions

- Mobile-only switch from numbered to load-more — a setting on the consuming section, not on this snippet. Section can render `{% if mobile %} type: 'load-more' {% else %} type: 'numbered' {% endif %}` based on the section's strategy
- Whether load-more's button uses the existing `button` snippet for visual consistency, or has its own minimal styling. Lean toward the existing button snippet for visual coherence — decide with first consumer

## Out of scope

- Infinite scroll (auto-load on viewport intersection) — IntersectionObserver-based pattern, per-project or a separate `infinite-scroll` modifier on the load-more mode
- Cursor-based pagination (Shopify uses offset-based for most resources; cursor exists for Storefront API but not used in standard pagination)
- "Jump to page N" form input — niche, per-project
- Filter/sort state preservation — handled at the URL level by the consuming section, not by this snippet (links inherit query params via Shopify's `paginate.next.url`)
