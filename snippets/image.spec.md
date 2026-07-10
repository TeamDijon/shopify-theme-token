# image

**Layer**: 0

**Type**: snippet (`snippets/image.liquid`)

**Status**: shipped

**Implementation**: `snippets/image.liquid` v1.0.0 (render surface)

**Reconciled**: 2026-06-28 (snippet v1.0.0 unchanged — dedicated L0 validation page + executable suite added; `preload` clarified to an HTTP `Link` response header, not a DOM `<link>`)

**Reviewed**: pending

**Depends on**: Shopify's `image_url` filter, Shopify's `image_tag` filter (handles `loading`, `fetchpriority`, `widths`, `sizes`, `preload`)

**Consumers**: `snippets/media.liquid` (primary), per-project sections rendering brand imagery, future `article-card` / `product-card` L0 primitives

## Purpose

Responsive image primitive. Renders a Shopify image with a generated `srcset` width ladder, optional mobile art direction wrapping into `<picture>` with a mobile `<source>`, and exposed loading / fetchpriority / preload knobs. The width ladders are hardcoded to two profiles — desktop-only (when no `mobile_image`) and desktop + mobile (when art-direction is set) — chosen to cover typical viewport widths without bloating `srcset` strings.

A sub-component primitive (no block; never the root of an L1 theme block). Consumers wrap or compose this snippet's output inside their own root markup. Block-backed consumers (e.g. `media.liquid`) pass the resulting `<img>` / `<picture>` into a positioned wrapper; sub-component consumers (e.g. future `article-card`) inline it inside a card layout.

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `image` | object (Shopify image) | yes | — | Desktop or fallback image. Snippet `break`s when blank. |
| `mobile_image` | object (Shopify image) | no | blank | Mobile art-direction override. When set, wraps the output in `<picture>` with a `<source media="(max-width: 47.99rem)">`. Blank → single `image_tag`. |
| `sizes_value` | string | no | `"auto, 100vw"` | Value for the `sizes` attribute. Auto-sizing fallback for lazy images; `100vw` for older engines. Override with a specific value when consumer's layout constrains intrinsic sizing (e.g. inside a `1-2` columns track, pass `"(min-width: 48rem) 33vw, 100vw"`). |
| `loading` | string | no | `"lazy"` | `loading` attribute. `eager` for above-the-fold critical imagery. |
| `fetchpriority` | string | no | `"auto"` | `fetchpriority` attribute. `high` for LCP candidates; `low` for tertiary imagery. |
| `preload` | boolean | no | `false` | Emit a preload hint via Shopify's `image_tag` preload param — surfaces as an HTTP `Link: …; rel="preload"; as="image"; imagesrcset=…` **response header** (not a DOM `<link>`), and `image_tag` couples it to `loading="eager"`. Use sparingly — only LCP-critical images benefit; others compete for bandwidth. |

## Width ladders

Three hardcoded ladders sized to the typical use:

| Profile | Widths (px) | When |
|---|---|---|
| Full ladder | `360, 480, 640, 750, 900, 1080, 1200, 1350, 1440, 1600, 1800, 2000, 2560` | `mobile_image` is blank — single `image_tag` carries the full 14-width ladder covering mobile through retina-desktop |
| Desktop (when art-directed) | `768, 1000, 1024, 1280, 1440, 1600, 1800, 2000, 2560` | `mobile_image` is set — feeds the desktop `<img>` inside the `<picture>` (mobile widths drop off since the mobile `<source>` covers them) |
| Mobile (when art-directed) | `360, 480, 640, 750, 900, 1080, 1200, 1350, 1440` | `mobile_image` is set — feeds the mobile `<source media="(max-width: 47.99rem)">` |

Ladders are pixel-density-aware via the browser's selection algorithm — a 1024-CSS-px request on a 2× display picks the 2048-or-larger candidate when the browser supports DPR-aware `srcset`.

## Output shape

**Without art direction** (`mobile_image` blank):

```html
<img src="<image_url at image.width>"
     srcset="<full ladder>"
     sizes="<sizes_value>"
     loading="lazy"
     fetchpriority="auto"
     width="<image.width>"
     height="<image.height>"
     alt="<image.alt or ''>">
```

**With art direction** (`mobile_image` set):

```html
<picture>
  <source media="(max-width: 47.99rem)"
          srcset="<mobile ladder built from mobile_image>"
          sizes="<sizes_value>"
          width="<mobile_image.width>"
          height="<mobile_image.height>">
  <img src="<image_url at image.width>"
       srcset="<desktop ladder>"
       sizes="<sizes_value>"
       loading="lazy"
       fetchpriority="auto"
       width="<image.width>"
       height="<image.height>"
       alt="<image.alt or ''>">
</picture>
```

Shopify's `image_tag` filter handles the `<img>` rendering — including the `alt` attribute from the image object's metadata, the intrinsic `width`/`height` for layout stability, and the preload hint when `preload: true`.

## Behavior

- **Early-exit on blank image.** `image == blank` → snippet `break`s; nothing renders. Consumers wrapping the snippet must guard their wrapper markup when they want a placeholder for blank cases (`media.liquid` does this — falls back to `placeholder_svg_tag`).
- **Art direction triggers `<picture>` wrapping.** A non-blank `mobile_image` emits the dual-source markup. The `media` query at `(max-width: 47.99rem)` aligns with the substrate's 48rem mobile/desktop boundary used elsewhere (48rem ≈ 768px ≈ standard tablet threshold).
- **Per-source widths in srcset.** The desktop `srcset` is built via Shopify's `image_tag` filter from `desktop_widths`. The mobile `srcset` is built in Liquid (loop over `mobile_width_list`, render `image_url: width:` per entry, join with commas). Both ladders are pixel-density-aware via the browser's selection algorithm.
- **`sizes_value` defaults to `"auto, 100vw"`.** The `auto` keyword (modern engines) lets the browser infer size from the image's intrinsic size at load time; the `100vw` fallback is for engines without `sizes: auto` support. Override with a specific value when consumer layout has known sizing (e.g. fixed-width sidebar image).
- **`loading="lazy"` by default.** Browser's native lazy-load. Above-the-fold imagery should override to `loading: 'eager'` + `fetchpriority: 'high'` to avoid render-delay.
- **Width / height for layout stability.** Both ladders emit the intrinsic `width`/`height` (or mobile equivalents) to reserve layout space — preventing layout shift as the image loads. Browsers compute the aspect ratio from these attributes; downstream CSS can override via `inline-size: 100%`.
- **Preload coordination.** `preload: true` routes through `image_tag`'s preload param, which emits an HTTP `Link: …; rel="preload"; as="image"; imagesrcset=…` **response header** (not a DOM `<link>`) and forces `loading="eager"` on the `<img>` (a preloaded image shouldn't lazy-load). Consumers ship one preload per page; combined `preload: true` on multiple images creates header pollution and bandwidth competition.

## A11y

- `alt` attribute populates from the image object's metadata (set in Shopify admin). Blank alt → decorative; non-blank → consumed by screen readers.
- The snippet doesn't override `alt` — passing `alt` as an arg isn't in the API. Per-instance alt overrides happen at the consumer level (the consumer mutates the image object's `.alt` before passing, or renders its own `<img>` tag directly).
- Decorative images (purely visual, captioned elsewhere) should have blank `alt` in Shopify admin; the snippet emits `alt=""` automatically.

## Locale keys

None — alt text comes from the image object's `.alt` field (merchant-set in admin, per-image). The snippet adds no runtime strings.

## Validation

Per `validation-contract.md` Tier 1b / Tier 2 boundary (utility-shape snippet consumed by L1 blocks; today validated through consumers).

- **Tier**: theme-primitive (L0 snippet — no block wraps it, so the harness renders `{% render 'image' %}` directly, each case tagged `data-case=<id>`, rather than a block matrix)
- **Page**: `sections/validation--primitive--image.liquid` + `templates/index.validation--primitive--image.json` (shipped). The two source images are real store Files referenced via `image_picker` settings (`shopify://shop_images/<file>`) → real image objects for `image_url`/`image_tag`.
- **Tests**: `.tests/e2e/primitive--image.spec.js` (executable; `npm run test:e2e`)
- **Requires seeded**: store Files `landscape.png` (2560×1440) + `portrait.png` (1440×2560), uploaded by `.scripts/seed-validation-assets.mjs` (needs `write_files`); referenced by handle as `shopify://shop_images/<file>`. Source ≥ 2560px so the full width ladder emits unclamped.
- **API surface** *(as a snippet)*:
  - **Single-image render**: image set, no mobile_image → single `<img>` with full ladder
  - **Art-direction render**: image + mobile_image set → `<picture>` with mobile `<source>` and fallback `<img>`
  - **Loading variants**: `lazy` (default), `eager` — verify attribute on `<img>`
  - **Fetchpriority variants**: `auto`, `low`, `high` — verify attribute
  - **Preload**: `false` (default) vs `true` — verify head `<link rel="preload">` emission
  - **sizes_value override**: pass custom value — verify `sizes` attribute on the `<img>`
- **Edge cases**:
  - Blank `image` → snippet `break`s; nothing renders (no `<img>`, no `<picture>`)
  - Image with blank `alt` (admin field empty) → `<img alt="">` (decorative)
  - Mobile image set but matches desktop (same asset) → still wraps in `<picture>`; harmless redundancy
  - Custom `sizes_value` for known layouts (e.g. `"(min-width: 48rem) 33vw, 100vw"` for a 3-column track) → carried through to both ladders' `sizes` attribute
  - Lazy + eager combination (lazy default with `fetchpriority: 'high'`) → browsers honor both; lazy controls when, fetchpriority controls how aggressively
- **Visual showcase**: indirect through `validation--primitive--media` (image media_type case). Reader confirms responsive ladder loads (DevTools network tab shows the chosen width); art-direction switches at the 48rem boundary.
- **Assertions** (executable — `.tests/e2e/primitive--image.spec.js`):
  - The `shopify://shop_images/<file>` ref resolves to a real image object (the `<img>` renders — a blank would `break`); single-image case emits the full 13-width ladder (`360…2560`), `sizes="auto, 100vw"`, `loading="lazy"`, `fetchpriority="auto"`, intrinsic `width="2560"`/`height="1440"`, a `src`, and a non-empty `alt` (from the file's metadata)
  - Art-direction emits `<picture>` with `<source media="(max-width: 47.99rem)">` carrying the 9-width mobile ladder (`360…1440`) and a fallback `<img>` carrying the 9-width desktop ladder (`768…2560`)
  - `loading` / `fetchpriority` knobs apply (`eager` + `high`; `low`); `sizes_value` override carries to the `sizes` attribute
  - `preload: true` emits an HTTP `Link` response header with `rel="preload"`, `as="image"`, `imagesrcset=…` (not a DOM `<link>`) and forces `loading="eager"`
  - Blank `image` renders nothing (snippet `break` — no `<img>`/`<picture>`)
- **Unit scope**: none (Liquid + Shopify filters; no JS)

## Out of scope

- **Custom `alt` arg** — alt text is per-image, set in admin. A per-render override breaks the alt-text governance pattern (admin is the source of truth for image metadata).
- **WebP / AVIF format negotiation** — Shopify's `image_url` filter handles format negotiation server-side via the `Accept` header. The snippet doesn't expose a format arg.
- **CSS background-image rendering** — this snippet emits `<img>` / `<picture>`. Background-image patterns (full-bleed hero backgrounds) belong in per-project CSS or in a separate primitive.
- **LQIP / blur-up placeholders** — Shopify ships server-side perceptual placeholders via the `image_tag` filter; custom blur-up flows (Mux-style, NextJS-style) are out of scope.
- **Lazy-load polyfill** — the snippet uses native `loading="lazy"`. Older-engine compatibility is the consumer's call.
- **Image transformation params** (`crop: 'center'`, `format: 'webp'`, `padding_color: ...`) — Shopify's `image_url` supports these; the snippet doesn't expose them as args. Per-project consumers wrap the snippet or call `image_url` directly when transformation is needed.

## Related

- Media spec (primary consumer; renders `<img>` inside its positioned wrapper): `media.spec.md`
- Video spec (sibling renderer for the `video` media_type branch): `video.spec.md`
- Asset loading (Shopify's image pipeline boundaries): `.context/docs/asset-loading.md`
