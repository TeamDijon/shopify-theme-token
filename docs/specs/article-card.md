# article-card

**Layer**: 0
**Type**: snippet (`snippets/article-card.liquid`)
**Status**: spec (not yet implemented)
**Depends on**: Shopify `article` object, `snippets/image.liquid` (responsive image renderer, already shipped), localized-date pattern (`.context/rules/liquid-date-translation.md`)
**Consumers**: `blog-index` section, featured-articles strip, related-articles (all planned)

## Purpose

Renders a blog article tile — image, date, title, excerpt, optional author. Whole-card clickable via a pseudo-overlay link whose accessible name is the article title.

## API

| Arg | Type | Required | Notes |
|---|---|---|---|
| `article` | object | yes | Shopify article. Blank → early exit |
| `heading_level` | string | no | Title heading tag for semantic nesting. Default `'h3'` |
| `show_image` | boolean | no | Default `true`. Skipped if article has no image |
| `show_date` | boolean | no | Default `true` |
| `show_excerpt` | boolean | no | Default `true` |
| `show_author` | boolean | no | Default `false` |
| `excerpt_word_limit` | number | no | Server-side excerpt truncation. Default `25` |

## Output shape

```html
<article class="article-card">
  {% if show_image and article.image %}
    <div class="card-media">
      {% render 'image', image: article.image, sizes_value: card_sizes, loading: 'lazy' %}
    </div>
  {% endif %}
  <div class="card-body">
    {% if show_date %}<time class="card-date" datetime="{{ article.published_at | date: '%Y-%m-%d' }}">{{ localized_date }}</time>{% endif %}
    <{{ heading_level }} class="card-title">
      <a class="card-link" href="{{ article.url }}">{{ article.title }}</a>
    </{{ heading_level }}>
    {% if show_excerpt %}<p class="card-excerpt">{{ excerpt }}</p>{% endif %}
    {% if show_author %}<span class="card-meta">{{ 'blog.article_card.by_author' | t: author: article.author }}</span>{% endif %}
  </div>
</article>
```

`.card-link` is the only anchor; its `::after` pseudo expands to cover the whole card (see CSS) — whole-card clickable, single clean accessible name.

## CSS

Per `.context/docs/css-standards.md` — component-rooted, no BEM:

```css
.article-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--card-gap, 0.75rem);

  & .card-media {
    aspect-ratio: var(--card-media-aspect, 3 / 2);
    overflow: hidden;
    border-radius: var(--card-radius, 0.5rem);

    & img {
      inline-size: 100%;
      block-size: 100%;
      object-fit: cover;
    }
  }

  & .card-body {
    display: flex;
    flex-direction: column;
    gap: var(--card-body-gap, 0.25rem);
  }

  & .card-date,
  & .card-meta {
    font-size: var(--card-meta-size, 0.8125rem);
    color: var(--card-meta-color, var(--color-foreground-muted));
  }

  & .card-title {
    font-size: var(--card-title-size, 1.125rem);
  }

  & .card-link {
    color: inherit;
    text-decoration: none;

    &::after {
      content: '';
      position: absolute;
      inset: 0;
    }
  }

  & .card-excerpt {
    color: var(--card-excerpt-color, inherit);

    /* Optional visual clamp — unset by default; consumer opts in for grid uniformity */
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: var(--card-excerpt-lines, none);
    overflow: hidden;
  }

  @media (hover: hover) {
    & .card-link:hover { color: var(--card-title-hover-color, var(--color-primary)); }
    &:has(.card-link:hover) .card-media img { scale: var(--card-media-hover-scale, 1.03); }
  }

  & .card-media img {
    transition: scale 0.3s ease;
  }
}
```

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--card-gap` | Gap between media and body | `0.75rem` |
| `--card-body-gap` | Gap between body elements | `0.25rem` |
| `--card-radius` | Media border radius | `0.5rem` |
| `--card-media-aspect` | Media aspect ratio | `3 / 2` |
| `--card-title-size` | Title font size | `1.125rem` |
| `--card-title-hover-color` | Title color on hover | `var(--color-primary)` |
| `--card-meta-size` | Date/author font size | `0.8125rem` |
| `--card-meta-color` | Date/author color | `var(--color-foreground-muted)` |
| `--card-excerpt-color` | Excerpt text color | inherits |
| `--card-excerpt-lines` | Visual line clamp (opt-in) | `none` |
| `--card-media-hover-scale` | Image zoom on hover | `1.03` |

## Behavior

- Excerpt resolution: `article.excerpt` when present, else `article.content | strip_html | truncatewords: excerpt_word_limit`
- Date localized via the `liquid-date-translation` pattern (English month names replaced with locale equivalents); `datetime` attr carries ISO `%Y-%m-%d` for machines
- `heading_level` interpolated into the title tag — caller sets it to nest correctly under the section heading
- Pseudo-overlay link: whole card clickable, accessible name is the title only
- Image rendered via `image.liquid` (lazy-loaded, responsive srcset); skipped entirely when the article has no image. `card_sizes` is the `sizes` attribute value reflecting the card's rendered column width (passed by the consumer or a sensible default like `(min-width: 48rem) 33vw, 100vw`)
- Hover (pointer devices only): title color shift + subtle image zoom, both respecting `prefers-reduced-motion` via the theme's reset-layer transition guards
- Early exit (`break`) when `article` is blank

## A11y

- `<article>` landmark element
- Single anchor (the title) — no nested interactive content; `::after` overlay provides the click target without breaking screen-reader navigation
- `<time datetime>` for machine-readable dates
- `alt` text on image from `article.title` (article images lack their own alt in Shopify)
- Hover effects gated behind `@media (hover: hover)` so touch devices don't get stuck hover states

## Locale keys to add

- `blog.article_card.by_author` — `"By {{ author }}"`

(Date month/day names use the existing `dates.*` keys per the localized-date pattern — no new date keys.)

## Out of scope

- Image rendering — consumes the existing `snippets/image.liquid` (responsive srcset/widths). The crop is the card's concern: `.card-media` owns the `aspect-ratio` box and the `<img>` fills it via `object-fit: cover`. `image.liquid` stays a pure renderer — no `aspect_ratio` param added (it would force a double wrapper inside `.card-media`)
- Tag/category pills on the card — compose with the `badge` snippet at consume-site if wanted
- Reading-time meta ("5 min read") — content calc, defer
- Comment count — defer

## Implementation-time decisions

- Excerpt strategy interplay — server-side `truncatewords` (DOM hygiene, default 25) coexists with optional CSS `--card-excerpt-lines` clamp (grid uniformity, default unset). Decide whether the first consumer wants both or just one
- Horizontal (media-beside-body) layout variant — likely a `layout:horizontal` modifier, but defer until a consumer needs it
