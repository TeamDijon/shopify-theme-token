# pagination

**Layer**: 0

**Type**: snippet (`snippets/pagination.liquid`)

**Status**: spec (not yet implemented)

**Implementation**: pending

**Reviewed**: pending

**Depends on**:
- Shopify `paginate` object (built-in) — produced by `{% paginate <collection> by N %}{% endpaginate %}` wrappers on the consuming section
- Locale keys under `pagination.*`
- Future `assets/pagination.js` module — load-more JS, loaded by the consuming section per `asset-loading.md`

**Consumers**:
- `collection-list` section (planned) — primary surface; paginates `collection.products`
- `search-results` section (planned)
- `blog-index` section (planned) — paginates `blog.articles`
- Article comment lists (planned) — paginates `article.comments`

## Purpose

Single source of truth for pagination UI. One snippet, two modes: `numbered` (default, SEO-friendly anchor links — crawler-readable, JS-independent) and `load-more` (button + progress text, JS-driven append). Consuming sections pick the mode that fits their archetype (collection grids often go load-more for product browsing; blog indexes go numbered for SEO + permalinks).

The snippet's two-mode shape means consumers don't choose between two snippets — they pass `type:` and the snippet emits the right markup. The visual contract differs per mode (horizontal page links vs vertical button + progress); each mode's accessible name and ARIA semantics are pre-wired.

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `paginate` | object | yes | — | The Shopify `paginate` object from the surrounding `{% paginate ... %}` block. Blank → snippet `break`s. |
| `type` | string | no | `'numbered'` | One of `'numbered'` or `'load-more'`. Off-list values fall to `'numbered'` (the safer default — works without JS). |
| `window` | number | no | `2` | Numbered mode only. Pages shown around the current page (`±window`). With current page = 7 and window = 2, the visible range is 5/6/7/8/9. First + last page always shown; gaps collapse to ellipses. |
| `aria_label` | string | no | `'pagination.aria_label' \| t` (`"Pagination"`) | Nav landmark label. Per-section override when multiple paginated lists coexist (e.g., `"Article pagination"` vs `"Comment pagination"`). |

Invoked from the consuming section inside the `{% paginate %}` block:

```liquid
{% paginate collection.products by 24 %}
  …grid markup…
  {% render 'pagination', paginate: paginate %}
{% endpaginate %}
```

## Output shape — numbered mode

```html
<nav class="pagination" data-modifiers="type:numbered" aria-label="Pagination">
  <a class="page-link prev" rel="prev" href="…">Previous</a>

  <a class="page-link" href="…">1</a>
  <span class="page-ellipsis" aria-hidden="true">…</span>
  <a class="page-link" href="…">5</a>
  <a class="page-link" href="…">6</a>
  <span class="page-link" aria-current="page">7</span>
  <a class="page-link" href="…">8</a>
  <a class="page-link" href="…">9</a>
  <span class="page-ellipsis" aria-hidden="true">…</span>
  <a class="page-link" href="…">12</a>

  <a class="page-link next" rel="next" href="…">Next</a>
</nav>
```

- The current page is a `<span aria-current="page">`, not an `<a>` — semantically and visually distinct without needing a `.current` class hook.
- Prev/next are conditional on `paginate.previous` / `paginate.next` (omitted at edges).
- Page links use the URLs from `paginate.parts` (Shopify's iterable that preserves query parameters — `?sort_by=…` etc. carries through).
- Ellipses (`…` = U+2026) collapse contiguous skipped pages.

## Output shape — load-more mode

```html
<div class="pagination" data-modifiers="type:load-more">
  <button class="load-more-button" type="button"
          data-next-url="…"
          data-current-count="24"
          data-total-count="120">
    Load more
  </button>

  <p class="pagination-progress" aria-live="polite">
    Showing 24 of 120
  </p>
</div>
```

- The button is omitted entirely on the last page (`paginate.next` blank); only the progress remains.
- `data-next-url` / `data-current-count` / `data-total-count` are the JS contract — `pagination.js` reads them on click, fetches, appends results, mutates the attributes.
- `aria-live="polite"` on the progress text so screen readers announce updates as items load.

## CSS

Component-rooted per `css-standards.md` — no BEM, descendants via `& .name`:

```css
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--pagination-gap, 0.5rem);

  & .page-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-block-size: 2.75rem;     /* 44px touch target (a11y conventions) */
    min-inline-size: 2.75rem;
    padding-inline: 0.75rem;

    color: var(--page-link-color, inherit);
    text-decoration: none;
    border-radius: var(--radius-small);

    &:hover {
      background-color: rgb(from var(--color-role-foreground) r g b / var(--opacity-subtle));
    }

    &[aria-current='page'] {
      color: var(--current-page-color, var(--color-role-foreground));
      font-weight: var(--current-page-weight, 600);
    }
  }

  & .page-ellipsis {
    color: var(--ellipsis-color, var(--color-role-foreground-muted));
  }

  & .pagination-progress {
    font-size: var(--progress-size, 0.875rem);
    color: var(--progress-color, var(--color-role-foreground-muted));
  }

  &[data-modifiers*='type:load-more'] {
    flex-direction: column;
    gap: var(--load-more-gap, 1rem);
  }
}
```

- Page links use `min-block-size: 2.75rem` + `min-inline-size: 2.75rem` for the 44×44px touch target (per `a11y-conventions.md` — `min-*-size`, not padding, so the target stays large even with single-digit page numbers).
- Hover uses `rgb(from)` syntax for the subtle background tint (matches the substrate's transparency vocabulary per `utility--css-variables.md`).
- Load-more mode flips to column layout for vertical stacking (button above progress).

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--pagination-gap` | Gap between page links (numbered mode) | `0.5rem` |
| `--load-more-gap` | Gap between button + progress (load-more mode) | `1rem` |
| `--page-link-color` | Page link text color | inherits from `color` |
| `--current-page-color` | Current page color | `var(--color-role-foreground)` |
| `--current-page-weight` | Current page font weight | `600` |
| `--ellipsis-color` | Ellipsis color | `var(--color-role-foreground-muted)` |
| `--progress-size` | Progress text font size | `0.875rem` |
| `--progress-color` | Progress text color | `var(--color-role-foreground-muted)` |

Page-link padding / touch-target sizing is not exposed as a variable — `2.75rem` is a hard a11y floor, not a tunable knob.

## Behavior

### Numbered mode

- **Pages shown per the window rule.** The snippet always emits the first page and the last page; pages within `window` of the current page; ellipses for gaps. With 12 pages, current = 7, window = 2: emits `1 … 5 6 7 8 9 … 12` (8 visible items + 2 ellipses). With current = 1, window = 2: emits `1 2 3 … 12` (no leading ellipsis since there's no gap). With ≤ `(window × 2) + 3` total pages, every page emits (no ellipses needed).
- **Page links come from `paginate.parts`.** Shopify's iterable provides `{title, url, is_link}` per page. Non-current pages have `is_link: true` and a `url` preserving query parameters. Current page has `is_link: false` and no URL — the snippet renders that part as a `<span aria-current="page">`. Ellipses are also `is_link: false` parts with `title: '…'`; the snippet swaps to `<span class="page-ellipsis" aria-hidden="true">` for those.
- **Prev / next link conditions.** `paginate.previous` and `paginate.next` are `nil` at first / last page; the snippet's `{% if paginate.previous %}` / `{% if paginate.next %}` gates handle the omission.
- **`rel="prev"` / `rel="next"` on edge links.** UA hint for prefetching + a11y semantics. Other page links don't carry rel attributes (rel="prev/next" is specific to sequential navigation; the numbered links aren't sequential to the current page).
- **No JS.** The mode renders pure HTML/CSS. Links work without scripts; crawlers see the page-N URLs; back/forward buttons work naturally.

### Load-more mode

- **`<button type="button">` (not `<a>`).** The element is a click-only trigger; the URL it fetches lives in `data-next-url`. Using `<button>` instead of `<a>` means no fallback navigation if JS fails — that's the trade-off of this mode. Consumers wanting crawler / no-JS support pick `type: 'numbered'`.
- **Progress text format.** Reads `pagination.progress` (`"Showing {{ shown }} of {{ total }}"`) when more pages exist; reads `pagination.progress_complete` (`"Showing all {{ total }}"`) when the user has reached the last page (button absent).
- **Initial `shown` computation.** `shown = paginate.current_offset + paginate.page_size`, clamped to `paginate.items` (the total). On first render (page 1), `current_offset = 0`, so `shown = page_size` (or `items` if `items < page_size`). The JS module updates `shown` as it appends.
- **Last-page rendering.** When `paginate.next` is blank, the snippet omits the button and renders only the progress text reading `pagination.progress_complete`. The pill stays in DOM so screen readers get the "you've reached the end" affordance.
- **JS contract for the update path.** `pagination.js` (loaded by the consuming section per `asset-loading.md`):
  1. Listens for `click` on `.load-more-button`
  2. Fetches `data-next-url` via the Section Rendering API (or by HTML fragment + DOMParser)
  3. Appends the result items to the grid (consumer-specific selector, passed via section setting or data attr on the grid container)
  4. Reads the next `paginate.next.url` from the fetched markup; mutates `data-next-url` accordingly
  5. Updates `data-current-count`, re-renders the progress label
  6. When the response had no `next.url` (last page), removes the button entirely; progress reads the complete variant

- **`aria-live="polite"` on the progress.** Screen readers announce updates when JS replaces the text content. Polite (not assertive) — load-more interruption isn't urgent.

## A11y

- **`<nav>` landmark in numbered mode; `<div>` root in load-more mode.** The numbered mode is structural navigation (multiple links → other pages of content); a landmark is appropriate. Load-more mode is a single interactive button + a progress message — not navigation. Different roots reflect different semantics.
- **`aria-label` on the nav landmark.** Default `"Pagination"`; per-section override when multiple paginated lists coexist on one page.
- **`aria-current="page"` on the current page span.** No `.current` class hook needed for CSS — the attribute serves both semantics and styling (`[aria-current='page']` selector).
- **`rel="prev"` / `rel="next"`** on edge links. UA hints; not load-bearing for screen readers.
- **`aria-hidden="true"` on ellipses.** Decorative; the SR walks past them to the surrounding numbered links.
- **`aria-live="polite"` on load-more progress.** Reads updates as items append.
- **44×44px touch target** on every page link via `min-block-size` / `min-inline-size` (a11y conventions: `min-*-size`, not padding, so the target stays large at small content sizes).

## Locale keys

Six keys under `pagination.*`:

- `pagination.aria_label` — `"Pagination"` (nav landmark default)
- `pagination.previous` — `"Previous"`
- `pagination.next` — `"Next"`
- `pagination.load_more` — `"Load more"`
- `pagination.progress` — `"Showing {{ shown }} of {{ total }}"`
- `pagination.progress_complete` — `"Showing all {{ total }}"`

`shown` and `total` are numeric interpolations. Pluralization of `"1 of 1"` vs `"24 of 120"` deferred — most locales don't need plural form on the "X of Y" pattern.

Locale-file structure follows `locale-conventions.md`. Keys live in `locales/en.default.json` and `locales/fr.json`.

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive — snippet-half).

- **Tier**: theme-primitive (Tier 2 — snippet-half group)
- **Page(s)**: `sections/validation--primitive--pagination.liquid` + `templates/index.validation--primitive--pagination.json` *(planned)*
- **API surface** (matrix to exercise):
  - **Numbered mode** at multiple `paginate` states:
    - 1 page total (no pagination needed — snippet should render nothing meaningful, possibly break)
    - 3 pages, current 1 / 2 / 3 (no ellipses; all pages visible)
    - 12 pages, current 1 / 7 / 12 (ellipses appear at appropriate positions)
    - 200 pages, current 100 (both ellipses, `±2` window around 100)
  - **`window` variants**: 0 (just current ± first + last), 1, 5
  - **Load-more mode**:
    - First load (current_offset 0, button present, progress shows page_size of items)
    - Mid-pagination (current_offset > 0, button present, progress shows accurate offset)
    - Last page (paginate.next blank, button absent, progress reads complete variant)
  - **`aria_label` override**: pass a custom label; nav landmark reads it
- **Edge cases**:
  - `paginate` blank → snippet `break`s; no markup
  - `paginate.items = 0` (empty collection) → numbered emits no pages; load-more reads `progress_complete` with `total: 0`
  - `paginate.items < paginate.page_size` (single page) → no prev/next links; in numbered mode, just the single page span (no ellipses); in load-more, button absent + progress_complete
  - Off-list `type` value (e.g. `'invalid'`) → falls to `'numbered'`
- **Visual showcase**: a long page with multiple `paginate` fixtures — different total counts, different current pages, both modes side-by-side at one fixture. Reader confirms the ellipsis collapse pattern, the touch-target sizing visually, the hover affordance, the current-page distinction.
- **Assertions** (prose; Playwright once installed):
  - Numbered mode: `<nav>` element with `aria-label` matching the resolved label; one `[aria-current='page']` element with text matching the current page number
  - Numbered mode: number of `.page-link` anchors matches the expected window+edges combination per `paginate.parts.size`
  - Numbered mode: prev anchor has `rel="prev"` and target URL matches `paginate.previous.url`; next anchor has `rel="next"` and target URL matches `paginate.next.url`
  - Load-more mode: button present iff `paginate.next` has a URL; `data-next-url` matches `paginate.next.url`; `data-current-count` matches the computed `shown`
  - Load-more mode: progress text matches the resolved locale string (with vs without "complete" suffix per `paginate.next` state)
  - Page-link computed `min-block-size` ≥ `2.75rem` (44px); same for `min-inline-size`
- **Unit scope**: none for the snippet itself (Liquid + CSS). The JS module (`pagination.js`, future) carries its own Vitest specs covering: fetch → parse → append flow, `data-next-url` mutation, button removal on last page, progress text update.

## Implementation-time decisions

- **Mobile-only mode switch.** The consuming section decides; the snippet doesn't internally detect viewport. Sections might render `{% if request.device.handheld %}{% render 'pagination', type: 'load-more', … %}{% else %}{% render 'pagination', type: 'numbered', … %}{% endif %}`, or use a setting to pin per-section mode. Defer to first consumer.
- **Load-more button styling.** Two options: (a) the snippet emits a minimal `<button class="load-more-button">` and the consumer adds modifier classes for the button-style family; (b) the snippet internally renders the `button` primitive (`{% render 'button', content: load_more_label, button_style: 'outline-primary', ... %}`) for visual consistency. Option (b) couples this snippet to the button primitive but inherits the family/variant system automatically. Lean toward (b); decide with first consumer.
- **`data-next-url` security.** The URL is from Shopify's `paginate.next.url` (server-trusted). Risk is low. If the JS module ever fetches arbitrary `data-next-url` values that aren't pinned to the current shop, add an origin check before the fetch.
- **Progress format granularity.** Some merchants prefer `"24 / 120 items"` (the slash format), others `"24 of 120"`. The locale key holds the default; per-project locale customization handles variants.

## Out of scope

- **Infinite scroll (auto-load on intersection).** IntersectionObserver-based pattern; could ship as a future `infinite-scroll` mode of this snippet or a separate primitive. Not in v1.
- **Cursor-based pagination.** Shopify Storefront API supports cursors but standard themed pagination is offset-based. Out of scope unless a Storefront-API surface enters the theme.
- **"Jump to page N" form input.** A `<input type="number">` + go button for direct navigation. Niche; per-project addition.
- **Filter / sort state preservation.** Handled by the consuming section's `paginate.next.url` (Shopify automatically preserves query params); not this snippet's concern.
- **Per-section pagination state in URL hash.** Some themes append `#page-N` for scroll restoration. Per-project addition; not modeled here.
- **Bidirectional load-more.** Loading a previous page on scroll up (for cursor-based feeds) is out of scope; load-more is forward-only.

## Related

- `button.md` — possible consumer (if load-more uses the button primitive for visual consistency)
- `.context/docs/locale-conventions.md` — locale file structure
- `.context/rules/a11y-conventions.md` — 44×44px touch target, `aria-live` for dynamic updates
- `.context/docs/asset-loading.md` — JS module loading pattern (`pagination.js` loaded by the consuming section)
- `.context/docs/modifier-system.md` — `data-modifiers` convention; this snippet emits `type:<value>`
- `.context/specs/utility--css-variables.md` — `rgb(from)` transparency syntax used in the hover state
