# video

**Layer**: 0

**Type**: snippet (`snippets/video.liquid`)

**Status**: shipped

**Implementation**: `snippets/video.liquid` v1.0.0 (render surface)

**Reconciled**: 2026-06-28 (snippet v1.0.0 unchanged — dedicated L0 validation page + executable suite added; video referenced via `video` setting as `shopify://files/videos/<filename>`)

**Reviewed**: pending

**Depends on**: Shopify's `image_url` filter (for the poster image), `<media-video>` custom element (if registered — not required for static rendering)

**Consumers**: `snippets/media.liquid` (primary, when `media_type: video`), future video-heavy specialized sections

## Purpose

Native HTML video primitive for Shopify-hosted videos (uploaded to the Shopify admin Files / video setting). Renders `<media-video>` wrapping a `<video>` element with `mp4` sources extracted from `video.sources`, plus optional mobile art direction (a second `<source>` at the mobile media-query). Two playback profiles: `atmosphere` (decorative background — autoplay + muted + no controls + loop) and `content` (interactive — caller-controlled autoplay/controls).

Distinguishes from `snippets/embed.liquid`: video renders Shopify-hosted videos via the `<video>` element with merchant-controlled playback; embed renders third-party iframes (YouTube, Vimeo) with provider-locked playback.

A sub-component primitive (no block). Block-backed consumers (`media.liquid`) pass it into a positioned wrapper.

## API

| Arg | Type | Required | Default | Notes |
|---|---|---|---|---|
| `video` | object (Shopify video) | yes | — | Desktop or fallback video. Snippet `break`s when blank. |
| `mobile_video` | object (Shopify video) | no | blank | Mobile art-direction override. Emits a `<source media="(max-width: 47.99rem)">` before the fallback. |
| `video_mode` | string (`atmosphere` / `content`) | no | `"atmosphere"` | Atmosphere: autoplay + muted + no controls (background-style). Content: caller-controlled. |
| `video_controls` | string (`minimal` / `full`) | no (content mode only) | `"minimal"` | `full` enables browser-native controls; `minimal` hides them. Atmosphere always hides. |
| `video_autoplay` | boolean | no (content mode only) | `false` | Autoplay in content mode. Always forces `muted` (browser autoplay policy requires it). |
| `video_loop` | boolean | no | `true` | `<video loop>` attribute. |
| `video_preload` | string (`none` / `metadata` / `auto`) | no | `"none"` | `<video preload>` attribute. `none` is the bandwidth-friendly default; `metadata` loads dimensions + first frame; `auto` preloads the full asset. |
| `loading` | string | no | `"lazy"` | `<video loading>` hint. |

## Output shape

```html
<media-video>
  <video
    playsinline
    {autoplay if atmosphere or content+autoplay}
    {muted if atmosphere or content+autoplay}
    {controls if content+full}
    {loop if video_loop}
    preload="<video_preload>"
    loading="<loading>"
    poster="<video.preview_image | image_url: width: 1920>">
    {<source src="<mobile_video mp4 url>" media="(max-width: 47.99rem)" type="video/mp4"> if mobile_video set}
    <source src="<video mp4 url>" type="video/mp4">
  </video>
</media-video>
```

`<media-video>` is a custom element wrapper (registered by `assets/media-video.js` when shipped; pure-CSS rendering doesn't require the registration to display the inner `<video>` correctly). The wrapper's role is JS attachment for future progressive enhancement (autoplay-on-intersect, click-to-play poster, etc. — not in scope today). The inner `<video>` is the load-bearing element.

The mp4 URL extraction walks `video.sources` and takes the first source where `source.format == 'mp4'`. Shopify exposes other formats (`hls`); the snippet currently emits mp4 only.

## Behavior

- **Atmosphere mode = background video.** `autoplay: true`, `muted: true`, `controls: false`. Browser autoplay policy permits muted autoplay on visible elements; the combination renders as a silent looping decorative video. `playsinline` (always set) keeps iOS from forcing fullscreen on tap.
- **Content mode = interactive video.** Autoplay opt-in via `video_autoplay`. When autoplay is true, `muted` is forced true (browser requirement; the snippet sets `muted = video_autoplay`). Controls per `video_controls`: `full` enables browser-native UI; `minimal` hides controls — useful when the consumer provides its own play button overlay.
- **Loop default true.** Atmosphere mode usually wants loop (background ambience); content mode loop is opt-out via `video_loop: false`. Default true for both modes.
- **Poster from `preview_image`.** Shopify generates a preview image per uploaded video; the snippet pulls it via `image_url: width: 1920`. The poster renders before the video plays (and during buffering / when paused). Escape via `| escape` for safety.
- **MP4-only source today.** `video.sources` exposes per-format URLs; the snippet picks mp4. HLS (`source.format == 'hls'`) and DASH support would be additive — needs `type="application/vnd.apple.mpegurl"` source emission and a JS HLS-shim for non-Safari browsers.
- **Art direction via additional source.** `mobile_video` becomes the first `<source>` with a `media` query. Browsers walk sources in order and pick the first match — the mobile source wins below 48rem, the fallback wins above.
- **`playsinline` always set.** iOS Safari defaults to fullscreen-on-play for `<video>` unless `playsinline` is present. Always emit; never harmful on non-iOS.
- **`preload="none"` by default.** Bandwidth-friendly: the browser fetches nothing until the user interacts (atmosphere mode auto-plays, so the browser fetches as needed; content mode waits for the click). `metadata` loads dimensions + first frame for layout stability. `auto` preloads the full asset — appropriate only for LCP-critical videos.
- **Early-exit on blank video.** `video == blank` → `break`. Consumers guard with their own placeholder (`media.liquid` falls back to `placeholder_svg_tag`).

## A11y

- **No track / captions.** The snippet doesn't emit `<track>` elements. Caption support belongs in a future API expansion (per-language caption file uploads in Shopify admin).
- **Reduced-motion compliance** is the consumer's responsibility. Atmosphere mode autoplays unconditionally; a consumer wanting to respect `prefers-reduced-motion: reduce` wraps the snippet behind a media-query gate or swaps to a poster-only render mode.
- **Aria label.** No explicit label is set on the `<video>` element. Screen readers announce based on accessible name resolution: `aria-label` on the wrapper > `<title>` inside > the `poster`'s alt > the source URL. Consumers wanting explicit labels add `aria-label` on the wrapping element.

## Locale keys

None — the snippet emits no user-facing text. The `<media-video>` custom element may surface state (loading / error) via i18n strings when its JS lands; those keys would be owned by the `media-video` component spec, not this snippet.

## Validation

Per `validation-contract.md` Tier 2 (L0 snippet — no block wraps it, so the harness renders `{% render 'video' %}` directly, each case tagged `data-case=<id>`).

- **Page**: `sections/validation--primitive--video.liquid` + `templates/index.validation--primitive--video.json` (shipped). Source videos are real store Files referenced via `video` settings as **`shopify://files/videos/<filename>`** (not `shopify://shop_images/…` — that's images; `shop_videos`/numeric-id/GID forms are all rejected with "must be a valid video shopify url", and a bad value 500s the render).
- **Tests**: `.tests/e2e/primitive--video.spec.js` (executable; `npm run test:e2e`)
- **Requires seeded**: store Files videos `landscape.mp4` + `portrait.mp4`, uploaded by `.scripts/seed-validation-assets.mjs` (needs `write_files`). Real encoded clips — Shopify's transcoder rejects degenerate stubs; processing is async (poll to READY before sources/poster exist).
- **API surface** *(as a snippet)*:
  - **Mode matrix**: `atmosphere` (autoplay, muted, no controls, loop) × `content` × `video_autoplay ∈ {false, true}` × `video_controls ∈ {minimal, full}` × `video_loop ∈ {false, true}`
  - **Art direction**: video + mobile_video set → mobile `<source>` precedes fallback; resize across 48rem to verify switch
  - **Preload variants**: `none` (default), `metadata`, `auto` — DevTools network tab shows initial fetch behavior
  - **Poster rendering**: video with `preview_image` set vs blank — verify the poster URL emission (Shopify generates preview_image automatically on upload, so blank is rare)
- **Edge cases**:
  - Blank `video` → snippet `break`s; nothing renders
  - Video with no mp4 source (HLS-only) → `video_url` resolves blank; the `<source>` `src` emits empty; the fallback `<video>` shows the poster with no playable source
  - Content mode + `video_autoplay: true` on a mobile device with low-power mode → browser may refuse to autoplay even with muted; the video stays paused at the poster
  - `loop: true` + `video_autoplay: false` + content mode → manually-started video loops; standard behavior
  - `playsinline` on iOS Safari → keeps the video in-page rather than fullscreen-on-play
- **Assertions** (executable — `.tests/e2e/primitive--video.spec.js`):
  - The `shopify://files/videos/<file>` ref resolves to a real video object (the `<media-video>` + `<video>` render — a blank would `break`)
  - Atmosphere mode: `autoplay`, `muted`, `loop`, `playsinline`, **no** `controls`, `preload="none"`, poster present, an mp4 `<source>`
  - Content mode: `minimal` hides controls + no autoplay (not force-muted); `full` + `video_autoplay` → `controls` + `autoplay` + forced `muted`
  - `video_loop: false` drops `loop`; `video_preload: 'metadata'` sets `preload="metadata"`
  - Art-direction: a `<source media="(max-width: 47.99rem)">` (mp4) precedes the fallback `<source>` (no media query)
  - Blank `video` renders nothing (snippet `break` — no `<media-video>`/`<video>`)
- **Deliberately unasserted**: the poster's exact URL (store-CDN-specific); runtime playback (browser behavior, not the snippet's emission); HLS `m3u8` source (the snippet emits mp4 only by design).
- **Unit scope**: future — the `<media-video>` custom element's JS lands as a separate spec when implemented (`assets/media-video.js` extending `BaseComponent`).

## Out of scope

- **HLS / DASH adaptive streaming** — single-mp4 source only. HLS support would need a JS shim (hls.js) for non-Safari, increasing JS budget; revisit if a project needs adaptive bitrate.
- **Captions / subtitles (`<track>`)** — no `<track>` elements emitted. Captions need merchant-side upload (per-language VTT files) which Shopify doesn't expose ergonomically yet.
- **Click-to-play with poster overlay** — the snippet doesn't render a play button over the poster. A separate primitive (`video-poster`?) would handle the gated-play UX with its own JS.
- **Volume / playback-rate / scrubber custom UI** — `controls: full` exposes browser-native UI; `controls: minimal` hides everything. Custom controls UI belongs in per-project extensions or a future stateful video block.
- **Intersection-based autoplay** (play when visible, pause when off-screen) — would be a `<media-video>` JS enhancement, not part of this snippet's contract.
- **Bandwidth detection / source switching at runtime** — single source at load time; no JS runtime to switch resolutions.

## Related

- Media spec (primary consumer; renders `<media-video>` inside its positioned wrapper; carries the `video_mode` / `video_controls` / `video_autoplay` / `video_loop` settings through): `.context/specs/media.md`
- Image spec (sibling renderer for the `image` media_type branch; same art-direction pattern via `<picture>` / `<source media>`): `.context/specs/image.md`
- Embed spec (third-party video alternative; same `media_size` sizing API): `.context/specs/embed.md`
- A11y conventions (reduced-motion consideration for atmosphere-mode autoplay): `.context/rules/a11y-conventions.md`
