# article-card

**Layer**: 0

**Type**: snippet (`snippets/article-card.liquid`)

**Status**: spec

**Implementation**: pending

**Reviewed**: pending

**Depends on**:
- Shopify `article` object (built-in)
- `snippets/image.liquid` (responsive image renderer; shipped — see `image.md`)
- Locale keys under `blog.article_card.*`
- Localized-date pattern per `.context/docs/liquid-dates.md`
- Scheme-role tokens + design constants (`--color-role-foreground-muted`, `--color-role-primary`, `--radius-default`, `--duration-slow`, `--ease-out`)

**Consumers**:
- `blog-index` section (planned) — primary surface; renders a grid of article cards from `blog.articles`
- Featured-articles strip (planned) — selects a handful of articles by handle or via metafields
- Related-articles row (planned) — appears below an article body, derived from tags / related-product associations

## Purpose

Blog-article tile primitive — image + date + title + excerpt + optional author, with whole-card clickability. The card is one of the few primitives that composes an interactive overlay link (`::after` pseudo on the title anchor) — this pattern lets the entire card act as a clickable surface with a single anchor (the title) carrying the accessible name.

The snippet is a sub-component primitive — never the root of a theme block. Consumed inline by archetype sections (blog-index, related-articles); the section owns the surrounding grid layout, the card owns its own composition + clickability.

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `article` | object | yes | — | Shopify article object. Blank → snippet `break`s. |
| `heading_level` | string | no | `'h3'` | Title heading tag for semantic nesting (`h2`–`h6`). Caller sets per nesting context — under a `<h2>` section heading, cards use `h3`; nested deeper, `h4`. |
| `show_image` | boolean | no | `true` | When `true` and the article has an image, renders the media region. When `false` or the article lacks an image, the media region is omitted entirely (no empty placeholder). |
| `show_date` | boolean | no | `true` | Renders the publish date as `<time datetime>` in the card body. |
| `show_excerpt` | boolean | no | `true` | Renders the resolved excerpt as a paragraph in the card body. |
| `show_author` | boolean | no | `false` | Renders the author byline under the excerpt. Default off — author is less common on blog cards than on PDP author bylines. |
| `excerpt_word_limit` | number | no | `25` | Server-side excerpt truncation when `article.excerpt` is blank (falls back to `article.content \| strip_html \| truncatewords: <limit>`). |
| `sizes` | string | no | `'(min-width: 48rem) 33vw, 100vw'` | Image `sizes` attribute. The default assumes a 3-column desktop grid; consumers in other layouts (2-column, full-width hero) pass their own. |

Invoked inline from consumers:

```liquid
{% for article in blog.articles %}
  {% render 'article-card', article: article, heading_level: 'h3' %}
{% endfor %}
```

## Output shape

```html
<article class="article-card">
  <div class="card-media">
    <img src="…" alt="<article title>" srcset="…" sizes="…" loading="lazy">
  </div>
  <div class="card-body">
    <time class="card-date" datetime="2026-04-12">12 avril 2026</time>
    <h3 class="card-title">
      <a class="card-link" href="/blogs/news/article-handle">How we built the storefront</a>
    </h3>
    <p class="card-excerpt">Long-form behind-the-scenes content about the building process…</p>
    <span class="card-meta">By Jane Doe</span>
  </div>
</article>
```

- `<article>` root carries the card semantically as a self-contained content unit.
- Single anchor (`.card-link` on the title). The `::after` pseudo (see CSS) expands to cover the whole card — the entire surface is clickable but only one accessible name is announced (the title).
- `.card-media` is omitted entirely when `show_image: false` OR `article.image` is blank — no empty placeholder.
- `.card-body` children are conditional on their `show_*` flags + content availability.

## CSS

Component-rooted per `css-standards.md` — no BEM, descendants via `& .name`:

```css
.article-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--card-gap, 0.75rem);

  & .card-media {
    aspect-ratio: var(--card-media-aspect, 3 / 2);
    overflow: hidden;
    border-radius: var(--card-radius, var(--radius-default));

    & img {
      inline-size: 100%;
      block-size: 100%;
      object-fit: cover;
      transition: scale var(--duration-slow) var(--ease-out);

      @media (prefers-reduced-motion) {
        transition-duration: 0s;
      }
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
    color: var(--card-meta-color, var(--color-role-foreground-muted));
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
  }

  &[data-modifiers*='excerpt-clamp'] .card-excerpt {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: var(--card-excerpt-lines, 3);
    line-clamp: var(--card-excerpt-lines, 3);
    overflow: hidden;
  }

  @media (hover: hover) {
    &:has(.card-link:hover) {
      & .card-link { color: var(--card-title-hover-color, var(--color-role-primary)); }
      & .card-media img { scale: var(--card-media-hover-scale, 1.03); }
    }
  }
}
```

- **`::after` pseudo overlay** — the only-anchor + whole-card-click trick. `.article-card` is `position: relative`; `.card-link::after` is `position: absolute; inset: 0`. The pseudo expands to cover the whole article. Click anywhere on the card → the link fires.
- **Hover behavior gated behind `(hover: hover)`** — touch devices don't get stuck hover states. `:has(.card-link:hover)` lifts the hover state to the card so both title and image respond together.
- **Excerpt clamp is opt-in via `data-modifiers="excerpt-clamp"`** — the `-webkit-box` display family has subtle layout side-effects (the box doesn't behave identically to a regular block). Default leaves the excerpt as a normal `<p>`; consumers opt in to clamping for grid-uniformity use cases (`<article class="article-card" data-modifiers="excerpt-clamp">`).
- **Image transition uses substrate motion tokens** (`--duration-slow` = 320ms, `--ease-out`) with explicit `prefers-reduced-motion` override that zeros the duration.

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
| `--card-gap` | Gap between media and body | `0.75rem` |
| `--card-body-gap` | Gap between body children (date, title, excerpt, meta) | `0.25rem` |
| `--card-radius` | Media border radius | `var(--radius-default)` (`0.5rem`) |
| `--card-media-aspect` | Media aspect ratio | `3 / 2` |
| `--card-title-size` | Title font size | `1.125rem` |
| `--card-title-hover-color` | Title color on hover | `var(--color-role-primary)` |
| `--card-meta-size` | Date / author font size | `0.8125rem` |
| `--card-meta-color` | Date / author color | `var(--color-role-foreground-muted)` |
| `--card-excerpt-color` | Excerpt text color | inherits |
| `--card-excerpt-lines` | Visual line clamp (only applied when `excerpt-clamp` modifier set) | `3` |
| `--card-media-hover-scale` | Image zoom factor on hover | `1.03` |

## Behavior

- **Excerpt resolution.** When `article.excerpt` is set (the merchant filled in a custom excerpt in Shopify admin), use it verbatim. Otherwise, fall back to `article.content | strip_html | truncatewords: excerpt_word_limit`. Strip-html removes inline formatting; truncatewords cuts at word boundaries (Shopify's filter adds `…` per its `:append` parameter, default ellipsis). When even `article.content` is blank, the excerpt is empty — the `<p>` element is omitted entirely.
- **Date localization.** Per `liquid-dates.md` § Translation: format with English `date: '%e %B %Y'` (or locale-suitable equivalent), then replace English month names with locale equivalents via the `dates.months.*` keys. The `datetime` attribute carries machine-readable ISO `%Y-%m-%d` for crawlers + assistive tech.
- **Heading level interpolation.** The `heading_level` arg renders inline as both the opening and closing tag. Caller's responsibility to pass a valid heading (`h2`–`h6`); off-list values would render invalid HTML. The snippet doesn't validate (Liquid can't gate dynamic tag names cleanly); validation lives at the consumer level.
- **Pseudo-overlay link.** Single anchor on the title; `::after` makes the whole card clickable without nesting interactive content. Screen readers announce one link (the title); pointer users click anywhere on the card. The pseudo is `content: ''` (empty string) — semantically inert, doesn't disrupt the page text content.
- **Image opt-out and absence handling.** Two independent conditions hide the media region: (1) `show_image: false` (consumer opts out), (2) `article.image` is blank (article has no image). When either is true, the entire `.card-media` element is omitted. No placeholder fallback — an article without an image is rendered as a text-only card.
- **Image rendered via `image.liquid`.** The primitive handles responsive `srcset`, `loading="lazy"`, `sizes` attribute, optional mobile art direction. The card just passes the article's image + a sensible `sizes` default; image.liquid does the rest.
- **Hover (pointer only).** `@media (hover: hover)` scopes hover effects to devices that report a real hover capability. Touch devices (`hover: none`) skip both effects. The title color shifts to scheme primary; the image scales `1.03` (subtle). Both share the `--duration-slow` transition. Reduced-motion override zeros the image scale transition.
- **Early exit on blank article.** Snippet `break`s — no markup. Defensive against absent / deleted articles referenced from outdated lists.

## A11y

- **`<article>` landmark.** Each card is a self-contained article snippet semantically. The blog-index section is a `<section>` containing multiple `<article>` cards.
- **Single accessible name per card.** Only the title anchor is interactive; the `::after` overlay makes the card clickable without adding a second focus stop or a competing accessible name. Screen readers announce one link per card (the title text).
- **`<time datetime>` for dates.** Machine-readable + human-readable. The visible text is the localized date; the `datetime` attribute carries ISO `%Y-%m-%d`. Assistive tech and search engines parse the ISO value.
- **Image alt fallback.** `<img alt="{{ article.title }}">` when the article's image lacks its own alt. Shopify articles often lack image alt text (the field exists but is rarely filled). Falling back to the title gives meaningful alt; consumer projects with article alt-text discipline pass the image's own alt via the image primitive's `alt` arg.
- **Hover gated to pointer devices.** Touch users don't see stuck hover states (no `scale` persisting after tap).
- **No `aria-describedby` linking title to excerpt.** Modern screen readers walk inline content naturally; the title-then-excerpt reading order is preserved by DOM order. Cross-linking with ARIA would create redundant announcements.

## Locale keys

One key under `blog.article_card.*`:

- `blog.article_card.by_author` — `"By {{ author }}"` (author byline; interpolates `author` argument)

Date month names use the existing `dates.months.*` keys per the localized-date pattern — no new date keys.

Locale-file structure follows `locale-conventions.md`. Keys live in `locales/en.default.json` and `locales/fr.json`.

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive — snippet-half).

- **Tier**: theme-primitive (Tier 2 — snippet-half group)
- **Page(s)**: `sections/validation--primitive--article-card.liquid` + `templates/index.validation--primitive--article-card.json` *(planned)*
- **API surface** (matrix to exercise):
  - **Article with image + author + excerpt + date** — all four metadata pieces; all `show_*` flags `true` (default + author opt-in)
  - **Article without image** (`article.image` blank) — media region omitted; card flows text-only
  - **`show_image: false`** — explicit opt-out; media region omitted even if article has an image
  - **Each `show_*` flag toggled off** (date, excerpt, author) — confirms omission
  - **`article.excerpt` blank** — falls through to `truncatewords` from content
  - **Article with no content + no excerpt** — excerpt block omitted entirely
  - **`heading_level` variants**: `h2`, `h3` (default), `h4` — verify the tag matches and styling adapts
  - **`excerpt-clamp` modifier** with `--card-excerpt-lines` overrides (2, 3, 5) — visual confirm the clamp
  - **`sizes` variants** — confirm the image responsive behavior at multiple viewport widths
- **Edge cases**:
  - `article` blank → snippet `break`s; no markup
  - Hover affordance on a touch device (DevTools toggle "Emulate touch") → hover effects suppress
  - Reduced-motion preference → image scale transition zeros; hover still shifts color (instant)
  - Very long title — verify wrapping doesn't break the overlay click target
  - Very short excerpt (single sentence) — verify body layout doesn't collapse oddly
  - RTL locale — verify directional gap / margin / alignment via dir="rtl" test
- **Visual showcase**: a grid of article cards covering all variants. Side-by-side: with/without image, all/none meta flags, h2/h3/h4 nesting, excerpt-clamp on/off. A hover-state band shown statically (mouse-over indication). Plus a reduced-motion band confirming transitions zero out.
- **Assertions** (prose; Playwright once installed):
  - `<article>` is the card root
  - Exactly one anchor (`.card-link`) inside; `href` matches `article.url`
  - When `show_image: true` + `article.image` present, `<img>` exists with `loading="lazy"`, `alt` matches `article.title` (unless image carries its own alt), and `sizes` matches the resolved value
  - `<time>`'s `datetime` matches `article.published_at | date: '%Y-%m-%d'`
  - Title tag matches `heading_level`
  - On hover (`page.hover()`), computed `color` on `.card-link` matches `--card-title-hover-color`
  - With reduced-motion enabled, computed `transition-duration` on `.card-media img` is `0s`
- **Unit scope**: none (Liquid + CSS).

## Implementation-time decisions

- **Excerpt strategy interplay.** Server-side `truncatewords` (DOM hygiene — short excerpt in markup, default 25 words) coexists with optional CSS `-webkit-line-clamp` (grid uniformity — visual cap regardless of word count). Most use cases want one or the other; both produce subtle visual side-effects when combined. First consumer chooses.
- **Horizontal layout variant.** Some article-card placements want media-beside-body (a wider hero card, a list-style layout). Likely a `layout:horizontal` modifier when needed; CSS rewrites `.article-card` to `flex-direction: row` and adjusts the media `aspect-ratio` + `inline-size`. Defer until first consumer requires it.
- **`alt` text quality.** Falling back to `article.title` provides minimally-acceptable alt text. Some merchant projects with strict alt-text discipline would prefer empty alt (decorative image, title carries meaning via the anchor) when the image lacks its own alt. Decision: ship with `article.title` fallback; per-project override via consumer passing explicit alt.
- **Reading-time meta.** "5 min read" is a derived value from content length. Useful on long-form blogs; noise on short-format. Defer; possibly a `reading-time` primitive that consumers compose into the card body.

## Out of scope

- **Image rendering mechanics.** The card consumes `snippets/image.liquid`; responsive srcset, lazy-loading, mobile art direction all live there. The crop is the card's concern (`.card-media` owns the `aspect-ratio` box; `<img>` fills via `object-fit: cover`). No `aspect_ratio` param added to image.liquid — that would force a double wrapper inside `.card-media`.
- **Tag / category pills on the card.** Compose with the `badge` primitive at consume-site if wanted. Not a card-internal concern.
- **Comment count display.** Most themes don't show comment counts on listing cards. Per-project addition.
- **Article-level metafields** (custom date formats, custom labels, structured byline). The card's API is the standard `article.*` Shopify object; metafield-driven content is consumer-composed (consumer reads metafields, passes them as overrides — though the current API doesn't accept arbitrary string overrides for title/excerpt; would need an extension).
- **Skeleton / loading state.** The card renders from server-side article data; no client-side loading state exists. A skeleton variant would matter for client-side article fetching (infinite scroll, filtered listings via Shopify Search & Discovery) — out of this snippet's scope.
- **Inline share buttons.** Per-article social-share would conflict with the whole-card overlay (multiple click targets break the simple accessible name story). Share buttons live on the article *detail* page, not the card.

## Related

- `image.md` — responsive image primitive consumed for the media region
- `badge.md` — sibling primitive consumers compose for category / tag pills on the card
- `.context/docs/liquid-dates.md` — localized-date pattern used for the visible date text
- `.context/docs/locale-conventions.md` — locale file structure
- `.context/rules/a11y-conventions.md` — `<article>` landmark, hover gating to pointer devices, image alt-text conventions
- `design-constants.md` — `--radius-default`, `--duration-slow`, `--ease-out` consumed for the card visuals
- `.context/docs/modifier-system.md` — `data-modifiers` convention; the `excerpt-clamp` opt-in pattern
