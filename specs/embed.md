# embed

**Layer**: 1

**Type**: block (`blocks/embed.liquid`) + matching snippet (`snippets/embed.liquid`)

**Status**: shipped

**Implementation**:
- `snippets/embed.liquid` v1.2.0 (render surface)
- `blocks/embed.liquid` v1.0.0 (block schema + render call)

**Reconciled**: 2026-06-05

**Reviewed**: pending

**Depends on**: `snippets/utility--base-selector.liquid`, `snippets/utility--modifiers.liquid`, `snippets/utility--media-sizing.liquid` (sizing-modifier + vars dual-mode), `snippets/utility--block-layout-vars.liquid`, `snippets/utility--dynamic-style.liquid`, `accessibility.embedded_content` locale key (runtime fallback for iframe title), `media_size` metaobject (optional), `content_width` metaobject (optional)

**Whitelisted by**: `sections/section.liquid`, `blocks/group.liquid`, `blocks/columns.liquid`

## Purpose

Third-party video embed primitive. Renders a lazy-loaded iframe for YouTube or Vimeo URLs, wrapped in an aspect-ratio box sized per the `media_size` metaobject (sharing the same sizing API as `media`). URL parsing happens in Liquid against known provider patterns; unknown URLs render a Shopify placeholder SVG with an editor-only diagnostic. The block stops at "render the iframe" — autoplay, custom controls, and click-to-load privacy gating are not in scope; merchants append URL params manually if they need control.

Distinguishing from `media`'s `video` mode: `media` renders Shopify-hosted videos via the `<video>` element; `embed` renders third-party iframes (YouTube / Vimeo). Different concerns, different APIs — `embed` has no overlay-content support, no art-direction, no autoplay (provider-controlled), no scheme override.

## URL parsing

Supported URL shapes (split on the indicated tokens, then strip query string and fragment):

- **YouTube**:
  - `youtu.be/<ID>` — split on `youtu.be/`, take last; split on `/`, take first
  - `youtube.com/embed/<ID>` — use as-is (already in embed form)
  - `youtube.com/shorts/<ID>` — split on `youtube.com/shorts/`, take last; split on `/`, take first
  - `youtube.com/watch?v=<ID>` — split on `?v=` or `&v=`, take last; split on `&` or `#`
- **Vimeo**:
  - `player.vimeo.com/video/<ID>` — use as-is
  - `vimeo.com/<ID>` — first numeric path segment after `vimeo.com/` is the video ID
  - `vimeo.com/<ID>/<HASH>` — unlisted videos; numeric ID followed by non-numeric hash; emit `?h=<HASH>` query param on the embed URL

Walk Vimeo path segments and take the first numeric one as the video ID; if the next segment is non-numeric, treat it as the unlisted hash. Handles `vimeo.com/channels/<name>/<ID>` and `vimeo.com/groups/<name>/videos/<ID>` shapes as side-effects.

Unknown URLs (provider doesn't match any pattern) → `provider` stays blank → placeholder SVG renders + diagnostic appears in editor.

## API

Snippet args (`{% render %}`) and block schema settings cover the same surface; the snippet adds `section` / `block` / `block_id` for render context. Args fall back to `block.settings.<id>` via `| default:` chains.

| Arg / Setting | Type | Required | Default | Notes |
|---|---|---|---|---|
| `section` | section | yes (render) | — | Snippet-only. |
| `block` | block | yes (render) | — | Snippet-only. |
| `block_id` | string | no | — | Snippet-only. |
| `url` | url | no | blank | Provider URL. YouTube and Vimeo shapes parsed in Liquid; unknown providers render a placeholder + editor diagnostic. |
| `title` | text | no | `accessibility.embedded_content` translation | Iframe `title` attribute for screen readers. Falls back to the locale-keyed default when blank. |
| `media_size` | metaobject (`media_size`) | no | blank → 16/9 aspect ratio default | Reads `.system.handle` (for `fill` special-case), `.type.value`, `.value.value`. Routed through `utility--media-sizing`. |
| `content_width` | metaobject (`content_width`) | no | blank → 100% | Caps `max-inline-size`. |
| `mobile_margin_block_start` | range (0–200, step 2, px) | no | `0` | Top margin below the desktop breakpoint. |
| `desktop_margin_block_start` | range (0–200, step 2, px) | no | `0` | Top margin at/above the desktop breakpoint. |

No mobile_media_size override (unlike `media`) — embed's primary axis is the iframe's aspect ratio, which is provider-locked; per-breakpoint sizing override has limited value.

## Output shape

```html
<div class="shopify-block shopify-block--embed"
     id="<base-selector>"
     {{ block.shopify_attributes }}
     data-modifiers="provider:youtube,sizing:ratio">  <!-- when URL parsed -->
  <iframe src="https://www.youtube.com/embed/<ID>"
          title="<title>"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen></iframe>
  <!-- OR for Vimeo: same shape with allow="autoplay; fullscreen; picture-in-picture" -->
</div>

<!-- OR placeholder when URL is blank or unparseable -->
<div class="shopify-block shopify-block--embed" ...>
  <svg>…placeholder…</svg>
  <p class="diagnostic" role="status">{{ 'blocks.embed.diagnostic.unrecognized_url' | t }}</p>
  <!-- Diagnostic only visible in editor (shopify-design-mode modifier on <html>) -->
</div>
```

`data-modifiers` emits:
- `provider:<youtube|vimeo>` when URL parses successfully — informational, not consumed by CSS today (could drive provider-specific styling)
- `sizing:<ratio|height|fill>` per `utility--media-sizing`'s classification of the `media_size` metaobject

Per-instance custom properties emit via `utility--block-layout-vars` + `utility--media-sizing` (vars mode) + `utility--dynamic-style` into a scoped `<style>` block keyed to `#<base-selector>`.

## CSS

Component-rooted on `.shopify-block--embed`. Layered in `@layer components`.

```css
.shopify-block--embed {
  position: relative;
  overflow: hidden;
  max-inline-size: var(--content-width, 100%);
  margin-inline: auto;
  aspect-ratio: 16 / 9;

  /* Sizing modes (parallel to media) */
  &[data-modifiers*='sizing:ratio'] {
    aspect-ratio: var(--media-ratio, 16 / 9);
  }
  &[data-modifiers*='sizing:height'] {
    aspect-ratio: auto;
    block-size: var(--media-height);
  }
  &[data-modifiers*='sizing:fill'] {
    aspect-ratio: auto;
    block-size: 100svh;
  }

  /* Iframe + placeholder fill the box absolutely */
  & > iframe,
  & > svg {
    display: block;
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    border: none;
  }

  /* Diagnostic — hidden by default */
  & > .diagnostic {
    display: none;
    position: absolute;
    inset: auto 0 0 0;
    margin: 0;
    padding: 0.5rem 0.75rem;
    background-color: rgb(0 0 0 / 0.75);
    color: white;
    font-size: 0.875rem;
    text-align: center;
  }

  /* Inset focus ring — overflow: hidden would clip it */
  & > iframe:focus-visible {
    outline-offset: -0.125rem;
  }
}

/* Editor-only diagnostic — visible when html carries shopify-design-mode */
html[data-modifiers*='shopify-design-mode'] .shopify-block--embed > .diagnostic {
  display: block;
}
```

The default `aspect-ratio: 16 / 9` on the root provides a fallback before any `sizing:*` modifier matches — if `media_size` is blank, the iframe still renders at 16:9. The `sizing:ratio` rule overrides only when `media_size` populates `--media-ratio`.

`margin-block-start` chains through `--mobile-margin-block-start` → `--desktop-margin-block-start` → section's `--block-rhythm` via `utility--block-layout-vars` (the section sets `--block-rhythm: var(--spacing-<picked-handle>)`).

## CSS custom properties (exposed)

Per-instance vars emitted by `utility--block-layout-vars` — see that spec for the variable contract + emission rules. Block-specific fallbacks consumed via `var(--<name>, <fallback>)` in this block's CSS: `--content-width` → `100%`; `--mobile-margin-block-start` / `--desktop-margin-block-start` → `0`.

Embed-specific vars emitted by `utility--media-sizing` (vars mode):

| Variable | Purpose | Default |
|---|---|---|
| `--media-ratio` | `aspect-ratio` for `sizing:ratio` | none (CSS rule defaults to `16/9` when absent) |
| `--media-height` | `block-size` for `sizing:height` | none |

## Behavior

- **URL parsing branches per provider.** Each `elsif` checks a URL substring (`youtu.be/`, `youtube.com/embed/`, `youtube.com/shorts/`, `youtube.com/watch`, `player.vimeo.com/video/`, `vimeo.com/`). Order matters because `vimeo.com/` is the most permissive — it sits last so `player.vimeo.com/` is matched first.
- **Vimeo path segment walking.** Vimeo URLs can be `<ID>`, `<ID>/<HASH>` (unlisted), `channels/<name>/<ID>`, or `groups/<name>/videos/<ID>`. The snippet splits the path on `/` and walks segments; first numeric segment is the video ID; if the next segment is non-numeric and non-blank, treat it as the unlisted hash and emit `?h=<HASH>` on the embed URL.
- **Unparseable URLs render a placeholder + editor diagnostic.** When `url` is non-blank but no provider matches, the snippet emits a Shopify placeholder SVG (`'image' | placeholder_svg_tag`) + a `<p class="diagnostic" role="status">` element with a locale-keyed message. The diagnostic is `display: none` by default; the global `html[data-modifiers*='shopify-design-mode'] .shopify-block--embed > .diagnostic { display: block }` rule reveals it only in the editor. Customers see the placeholder only; merchants see the diagnostic explaining why.
- **`title` attribute carries an SR-readable label.** Required for accessible iframes. When blank, falls back to `accessibility.embedded_content` (a shared locale key, see `a11y-conventions.md`).
- **Sizing modes via `utility--media-sizing`.** Same sizing utility as `media` — emits `sizing:ratio` / `sizing:height` / `sizing:fill` modifier and the matching var. Centralizes the classification so the two block types can't drift on sizing semantics. The `fill` handle renders at `100svh` (full small-viewport height).
- **No bleed.** Embed doesn't expose a `bleed` setting. The iframe's positioning (`absolute; inset: 0`) already fills the wrapper; bleeding the wrapper to the viewport would change the iframe's apparent aspect-ratio context. Per-project additions can add bleed if needed.
- **Iframe `allow` attribute differs per provider.** YouTube: `accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share`. Vimeo: `autoplay; fullscreen; picture-in-picture`. Each provider's iframe spec lists different feature policies; the snippet emits the relevant set.
- **`loading="lazy"`.** Both providers' iframes ship with native lazy-load. No JS click-to-load gate.
- **`allowfullscreen` attribute.** Both providers' iframes get the legacy attribute (browsers normalize it alongside the `allow` value).
- **Inset focus ring.** `outline-offset: -0.125rem` ensures the focus ring on a focused iframe doesn't get clipped by the wrapper's `overflow: hidden`. Pattern shared with `media` (which inset-offsets focused buttons in overlay content).
- **No autoplay / no controls customization.** Browser-side autoplay (provider-specific URL params: `?autoplay=1`, `&autoplay=1` for YouTube; `?autoplay=1` for Vimeo) is opt-in by merchant via URL editing. The block doesn't expose autoplay because provider policies (mute requirement, user-gesture requirement, mobile differences) make a setting misleading.
- **`{{ block.shopify_attributes }}` emission.** On the outer wrapper.

## Locale keys

Schema strings under `blocks.embed.*` (defined in `locales/en.default.schema.json` + `locales/fr.schema.json`):

- `blocks.embed.name`
- `blocks.embed.settings.embed.content` (group header)
- `blocks.embed.settings.url.{label,info}`
- `blocks.embed.settings.title.{label,info,default}`
- `blocks.embed.settings.layout.content` (group header)
- `blocks.embed.settings.media_size.{label,info}`
- `blocks.embed.settings.content_width.{label,info}`
- `blocks.embed.settings.top_spacing.content` (group header)
- `blocks.embed.settings.{mobile,desktop}_margin_block_start.label`
- `blocks.embed.presets.embed.{name,category}`

Runtime strings (`locales/en.default.json` + `locales/fr.json`):

- `accessibility.embedded_content` — shared SR fallback (see `a11y-conventions.md`)
- `blocks.embed.diagnostic.unrecognized_url` — editor-only diagnostic message

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive).

- **Tier**: primitive (L1 block-backed; no sub-component half)
- **Page**: `sections/validation--primitive--embed.liquid` + `templates/index.validation--primitive--embed.json` (shipped)
- **API surface**:
  - **URL parsing matrix**: every supported shape per provider (4 YouTube, 3 Vimeo + unlisted) → verify provider modifier + embed URL emission
  - **Unknown URL**: `https://example.com/video/xyz` → placeholder SVG + diagnostic in editor; no iframe
  - **Title fallback**: blank `title` → SR reads `accessibility.embedded_content` translation; non-blank → reads the literal
  - **Sizing matrix**: blank `media_size` (defaults to 16/9), each shipped entry — verify aspect-ratio / block-size emission via modifier + var
  - **content_width × sizing**: capped content_width × `sizing:fill` → wrapper caps inline; block-size still fills viewport (height isn't affected by content_width)
  - **Top-spacing**: independent mobile + desktop values
- **Surface delegation**: URL-parsing correctness is the snippet's responsibility; provider iframe behavior (autoplay, controls, fullscreen) is the provider's responsibility — this page validates that the snippet emits the correct iframe markup, not the iframe's runtime behavior.
- **Edge cases**:
  - Blank `url` → placeholder SVG only; no diagnostic emitted (the editor-only diagnostic conditions on `url != blank` — a blank URL is "not yet configured", not "configured wrong")
  - Unparseable URL → placeholder SVG + diagnostic element; diagnostic visible only when `<html>` carries `shopify-design-mode`
  - Vimeo URL with unlisted hash (`vimeo.com/<ID>/<HASH>`) → embed URL includes `?h=<HASH>`
  - YouTube `watch` URL with extra params (`?v=<ID>&t=42s`) → ID parsed from `?v=`, extra params dropped
  - Trailing slash on URLs (`youtu.be/<ID>/`) → ID resolves to clean value (the split-on-`/` first-element fallback)
  - Iframe focus → inset focus ring visible (not clipped by overflow: hidden)
- **Visual showcase**: per-provider URL variants in a grid; sizing variants per provider; unrecognized URL row showing the diagnostic; blank URL showing the placeholder.
- **Assertions** (prose; Playwright once installed):
  - Parsed URLs produce iframes with the correct `src` per provider's embed pattern
  - Iframes carry `loading="lazy"`, `title="<merchant value or default>"`, and provider-specific `allow` policy
  - Unknown URLs produce no `<iframe>`; produce `<p class="diagnostic">`
  - The diagnostic is `display: none` outside editor; visible when `html[data-modifiers*='shopify-design-mode']`
  - Sizing modes emit the expected modifier and var; computed `aspect-ratio` / `block-size` match
- **Unit scope**: none (Liquid URL parsing; no JS shipped)

## Out of scope

- **Click-to-load privacy gating** — iframes load directly with `loading="lazy"`. A privacy-gated mode (poster image + click → load iframe) would be a separate primitive or a per-project extension.
- **Custom video controls UI** — provider-native only. Custom-styled controls (skip, scrub, mute) belong in `media`'s `<video>` mode or in a per-project primitive.
- **Autoplay setting** — not exposed because provider policies (mute requirement, user-gesture requirement, mobile-specific behavior) make a single boolean misleading. Merchants append `?autoplay=1` URL params per provider's docs.
- **Additional providers** — only YouTube and Vimeo today. Adding a provider means a new `elsif` branch + the right `allow` policy + the right embed URL pattern. Per-project additions for TikTok, Wistia, Loom land that way.
- **Aspect-ratio override per provider** — both providers default to 16/9 in their iframe embed pattern. Vertical (9/16) and square (1/1) work via the `media_size` setting; the iframe respects whatever the wrapper resolves.
- **Caption / transcript surface** — accessibility beyond `title` (captions track, transcript text) belongs in a separate primitive or per-project extension. Provider-side captions render inside the iframe.
- **Bleed** — see Behavior. Per-project extensions add if needed.

## Related

- Media spec (sibling block specialized for Shopify-hosted media; shares `media_size` + `utility--media-sizing`): `.context/specs/media.md`
- Accessibility conventions (`accessibility.embedded_content` shared key; iframe a11y patterns): `.context/rules/a11y-conventions.md`
- Schema conventions (top-spacing pair): `.context/docs/schema-conventions.md`
- Design-system metaobjects (`media_size` consumption, `content_width` consumption): `.context/docs/design-system-metaobjects.md`
- Modifier system (`data-modifiers` convention; `shopify-design-mode` document-level modifier): `.context/docs/modifier-system.md`
