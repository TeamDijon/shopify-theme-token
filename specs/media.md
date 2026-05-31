# media

**Layer**: 1

**Type**: block (`blocks/media.liquid`) + matching snippet (`snippets/media.liquid`)

**Status**: shipped

**Implementation**:
- `snippets/media.liquid` v1.4.0 (render surface)
- `blocks/media.liquid` v1.4.0 (block schema + render call)

**Reconciled**: 2026-05-31 (subgrid migration Stage 2 — bleed boolean replaced by responsive enum API; bleed CSS moved to section; centered-ancestor footgun resolved)

**Depends on**: `snippets/image.liquid` (for `media_type: image`), `snippets/video.liquid` (for `media_type: video`), `snippets/utility--base-selector.liquid`, `snippets/utility--modifiers.liquid`, `snippets/utility--media-sizing.liquid` (sizing-modifier + vars dual-mode), `snippets/utility--block-layout-vars.liquid`, `snippets/utility--dynamic-style.liquid`, `media_size` metaobject (optional), `content_width` metaobject (optional), `container_style` metaobject (optional)

**Whitelisted by**: `sections/section.liquid`, `blocks/group.liquid`, `blocks/columns.liquid` (recursive container composition)

## Purpose

Image / video media container with overlay-content support. The third L1 container block (alongside `group` and `columns`), specialized for visual media. Renders an `<img>` (via `snippets/image.liquid`) or a `<media-video>` (via `snippets/video.liquid`) sized per the `media_size` metaobject, with optional overlay tint, scheme override, container-style variant, and inline-blocks composed over the media via `<media-contents>`.

Distinguishing from siblings:

- **`group`** — flex layout for arbitrary block composition; no media surface
- **`columns`** — grid layout with fixed column ratios; no media surface
- **`media`** — single media element (image or video) with optional overlay content composed via a narrow whitelist (`title`, `richtext`, `button`, `group`). Hero-style sections compose here.

The overlay-content whitelist is narrower than `group`/`columns` by design: media's children sit absolute-positioned over the visual, so deep nesting (a columns inside the overlay) would compete with the media's positioning math. The 4 whitelisted children cover the hero pattern — heading + body + CTA, optionally grouped — while keeping the composition predictable.

## API

Snippet args (`{% render %}`) and block schema settings cover the same surface; the snippet adds `section` / `block` / `block_id` / `contents` for render context. Args fall back to `block.settings.<id>` via `| default:` chains.

| Arg / Setting | Type | Required | Default | Notes |
|---|---|---|---|---|
| `section` | section | yes (render) | — | Snippet-only. |
| `block` | block | yes (render) | — | Snippet-only. |
| `block_id` | string | no | — | Snippet-only. |
| `contents` | string | no | blank | Snippet-only. Pre-rendered child blocks markup; the block file does `{% capture contents %}{% content_for 'blocks' %}{% endcapture %}` before rendering. Wrapped in `<media-contents>` when non-blank. |
| `media_type` | select (`image` / `video`) | no | `"image"` | Branches the inner render between `image.liquid` and `video.liquid`. |
| `image` | image_picker | no (visible when `media_type: image`) | — | Primary image. When blank: placeholder SVG renders. |
| `mobile_image` | image_picker | no (visible when `media_type: image` and `image` is set) | — | Art-direction image for mobile viewport. Triggers `art-direction` modifier when paired with primary. |
| `video` | video | no (visible when `media_type: video`) | — | Primary video. When blank: placeholder SVG renders. |
| `mobile_video` | video | no (visible when `media_type: video` and `video` is set) | — | Art-direction video for mobile viewport. |
| `video_mode` | select (`atmosphere` / `content`) | no | `"atmosphere"` | Atmosphere mode: muted, autoplay, no controls (background-style). Content mode: optional autoplay + controls. See `snippets/video.liquid`. |
| `video_controls` | select (`minimal` / `full`) | no (visible when `video_mode: content`) | `"minimal"` | Controls UI in content mode. |
| `video_autoplay` | checkbox | no (visible when `video_mode: content`) | `false` | Autoplay in content mode. |
| `video_loop` | checkbox | no (visible when `media_type: video`) | `true` | Loop the video. |
| `media_size` | metaobject (`media_size`) | no | blank → 16/9 aspect ratio default | Reads `.system.handle` (for the `fill` special-case → 100svh), `.type.value` (`ratio` / `relative` / `fixed`), and `.value.value`. Routed through `utility--media-sizing` (emits `sizing:ratio` / `sizing:height` / `sizing:fill` modifier + matching `--media-ratio` or `--media-height` var). |
| `mobile_media_size` | metaobject (`media_size`) | no | inherits desktop | Mobile-viewport override. Same shape as `media_size`. Emits `--mobile-media-ratio` / `--mobile-media-height` for the mobile media query. |
| `bleed_desktop` | select (`none` / `inline_start` / `inline_end` / `both`) | no | `"none"` | Media block's bleed direction at/above 48rem. Emitted as `bleed-desktop:<value>` modifier when ≠ `none`; the section's named-line bleed grid resolves positioning. Only fires when media is a direct child of `<token-section>` (the strict container-only bleed model); nested-inside-container media positions in its container's layout instead. |
| `bleed_mobile` | select (`none` / `both`) | no | `"none"` | Media block's bleed direction below 48rem. Single-column mobile has no edge tracks; per-side bleed has no geometric meaning there. Emitted as `bleed-mobile:both` modifier when set. |
| `image_fit` | select (`cover` / `contain`) | no (visible when `media_type: image`) | `"cover"` | `object-fit` on the image. `cover` fills the box (cropping); `contain` shows the full image (possibly letterboxed). Emits `image-fit:contain` modifier when ≠ `cover`. |
| `horizontal_alignment` | select (`start` / `center` / `end`) | no | `"start"` | `align-items` on `<media-contents>` (flex column). |
| `vertical_alignment` | select (`start` / `center` / `end`) | no | `"end"` | `justify-content` on `<media-contents>` (flex column). Default `end` matches the hero pattern (content at bottom over the media). |
| `content_width` | metaobject (`content_width`) | no | blank → 100% | Caps `max-inline-size`. Composes with bleed (cap = section's content cap; per `container-patterns.md`). |
| `gap` | range (0–100, step 2, px) | no | `16` | Gap between overlay-content children. Emitted as `--gap` in rem. Zero-emission skipped. |
| `overlay_color` | color (alpha) | no | `rgba(0,0,0,0)` (transparent) | Tint color painted over the media. Blank or fully transparent → no overlay element emitted. |
| `container_style` | metaobject (`container_style`) | no | blank | Emits `container-style:<handle>` modifier. Centralized variant CSS in `layer-theme.css` (card / outlined / elevated). |
| `color_scheme` | theme setting (`color_scheme`) | no | blank | Overrides the section's color scheme for this block and its descendants. Emits `color-scheme:<id>` modifier. |
| `mobile_margin_block_start` | range (0–200, step 2, px) | no | `0` | Top margin below the desktop breakpoint. |
| `desktop_margin_block_start` | range (0–200, step 2, px) | no | `0` | Top margin at/above the desktop breakpoint. |

## Whitelisted children

```
title, richtext, button, group
```

Narrower than `group`/`columns` by design — overlay-content composition pattern is heading + body + CTA, optionally grouped. Nested `media` inside `media` is not whitelisted (no recursive media composition). `group` is whitelisted to allow rolling up multiple overlay elements under one alignment/gap, including the `direction:row` group that gives "title left, button right" hero patterns.

## Output shape

```html
<div class="shopify-block shopify-block--media"
     id="<base-selector>"
     {{ block.shopify_attributes }}
     data-modifiers="media-type:image,has-children,art-direction,bleed,image-fit:contain,container-style:card,color-scheme:scheme-2,sizing:ratio">
  <picture>…image markup with art direction…</picture>
  <!-- OR -->
  <media-video>…video markup…</media-video>
  <!-- OR placeholder -->
  <svg>…placeholder…</svg>

  <media-overlay></media-overlay>  <!-- when overlay_color is set -->

  <media-contents>
    <!-- overlay blocks: title / richtext / button / group -->
  </media-contents>  <!-- when contents is non-blank -->
</div>
```

`data-modifiers` accumulates tokens per emit-when-set: `media-type:<type>` always; `has-children` when `contents` is non-blank; `art-direction` when mobile + desktop media are both set; `bleed` when set; `image-fit:contain` when image and non-default; `container-style:<handle>` when set; `color-scheme:<id>` when set; `sizing:<mode>` per `utility--media-sizing`'s classification.

Per-instance custom properties emit via `utility--block-layout-vars` + `utility--media-sizing` (vars mode) + `utility--dynamic-style` into a scoped `<style>` block keyed to `#<base-selector>`.

## CSS

Component-rooted on `.shopify-block--media`. Layered in `@layer components`.

```css
.shopify-block--media {
  position: relative;
  overflow: hidden;
  max-inline-size: var(--content-width, 100%);
  margin-inline: auto;

  /* Media fills the block; cover is the default object-fit */
  & > picture, & > picture > img, & > img, & > svg,
  & > media-video, & > media-video > video {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
  }

  /* Image fit: contain — only emitted when image_fit ≠ cover */
  &[data-modifiers*='image-fit:contain'] {
    & > picture, & > picture > img, & > img, & > svg {
      object-fit: contain;
    }
  }

  /* Sizing modes — routed through utility--media-sizing */
  &[data-modifiers*='sizing:ratio'] {
    aspect-ratio: var(--mobile-media-ratio, var(--media-ratio));
    @media (width >= 48rem) { aspect-ratio: var(--media-ratio); }
  }
  &[data-modifiers*='sizing:height'] {
    block-size: var(--mobile-media-height, var(--media-height));
    @media (width >= 48rem) { block-size: var(--media-height); }
  }
  &[data-modifiers*='sizing:fill'] {
    block-size: 100svh;
  }

  /* Bleed — escape section gutter, span full visible viewport */
  &[data-modifiers*='bleed'] {
    inline-size: 100dvw;
    max-inline-size: none;
    margin-inline: calc(50% - 50dvw);
  }

  /* Overlay tint */
  & media-overlay {
    position: absolute;
    inset: 0;
    background-color: var(--overlay-color, transparent);
    pointer-events: none;
  }

  /* Overlay content — flex column, positioned over media + overlay */
  & media-contents {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: var(--vertical-alignment, end);
    align-items: var(--horizontal-alignment, start);
    gap: var(--gap, 1rem);
    padding: var(--gutter, 1rem);

    & .shopify-block--button:focus-visible {
      outline-offset: -0.25rem;  /* inset so overflow:hidden doesn't clip */
    }
  }
}
```

`container_style` variant rules live centrally in `layer-theme.css` `@layer theme`, scoped via `:where(.shopify-block--group, .shopify-block--columns, .shopify-block--media)[data-modifiers*='container-style:<handle>']`. The variant CSS for `card` / `outlined` / `elevated` doesn't live in this snippet — see `specs/container-style.md`.

`margin-block-start` chains through `--mobile-margin-block-start` → `--desktop-margin-block-start` → section's `--block-rhythm-mobile/desktop` via `utility--block-layout-vars`.

## CSS custom properties (exposed)

Per-instance vars emitted by `utility--block-layout-vars`:

| Variable | Purpose | Default |
|---|---|---|
| `--content-width` | `max-inline-size` cap (px from metaobject) | `100%` |
| `--mobile-margin-block-start` / `--desktop-margin-block-start` | Top margin per breakpoint | `0` |

Media-specific vars emitted by `utility--media-sizing` (vars mode):

| Variable | Purpose | Default |
|---|---|---|
| `--media-ratio` | Desktop aspect-ratio for `sizing:ratio` | none (CSS rule defaults to `16/9` when absent) |
| `--mobile-media-ratio` | Mobile aspect-ratio override for `sizing:ratio` | inherits desktop |
| `--media-height` | Desktop `block-size` for `sizing:height` | none |
| `--mobile-media-height` | Mobile `block-size` override for `sizing:height` | inherits desktop |

Layout vars from the snippet:

| Variable | Purpose | Default |
|---|---|---|
| `--horizontal-alignment` | `align-items` on `<media-contents>` | `start` (only emitted when ≠ `start`) |
| `--vertical-alignment` | `justify-content` on `<media-contents>` | `end` (only emitted when ≠ `end`) |
| `--gap` | Gap between overlay children (rem) | `1rem` (only emitted when > 0) |
| `--overlay-color` | Overlay tint | `transparent` (only emitted when overlay is non-transparent) |

Zero-emission discipline throughout.

## Behavior

- **Branch on `media_type`.** `image` → `{% render 'image' %}` with primary + mobile_image. `video` → `{% render 'video' %}` with primary + mobile_video + mode/controls/autoplay/loop. Either renders the placeholder SVG when its primary asset is blank, so the block always emits some media surface.
- **Art direction triggers a modifier, not a separate output path.** When both desktop and mobile media are set, the snippet emits `art-direction` modifier on the root; the `image`/`video` snippets handle the dual-source `<picture>`/`<source>` markup. The modifier is informational (debug/inspection) and doesn't itself drive CSS today.
- **Sizing routed through `utility--media-sizing`.** Centralizes the `fill` / `ratio` / `relative` / `fixed` classification so `media` and `embed` can't drift on sizing semantics. The utility emits the modifier in "modifier mode" and the vars in "vars mode"; the snippet invokes both. The `fill` handle is special (no `type`/`value`; means viewport-height); `ratio` and `relative` emit `aspect-ratio`; `fixed` emits explicit `block-size`.
- **Bleed assumes centered ancestor chain.** The `margin-inline: calc(50% - 50dvw)` math anchors against the parent's centerline. Inside an off-center column track (the narrower track of `1-3` columns), the bleed visually drifts because the centerline is offset from the section's. Snippet doc block documents this limitation; merchants composing bleed-inside-columns should use the section's bleed model instead.
- **Image-fit modifier emission is conditional.** `image-fit:contain` emits only when `media_type: image` AND `image_fit != cover`. Video doesn't expose image_fit — `<video>` element's intrinsic sizing differs from `<img>`. The `cover` default keeps the modifier off the data-modifiers attribute in the common case.
- **Overlay tint via a sibling element.** `<media-overlay></media-overlay>` is an empty position-absolute element painted between the media (z-natural-order: 1) and `<media-contents>` (z-natural-order: 2). Stacking is natural-order — no explicit `z-index`. `pointer-events: none` keeps the overlay click-through. Element emits only when `overlay_color` is non-blank and non-transparent.
- **Overlay content (`<media-contents>`) flex layout.** Flex column with `justify-content` (vertical alignment), `align-items` (horizontal), `gap` (per-instance var), and `padding: var(--gutter)` so content respects the section's gutter inside the overlay. The `&:focus-visible` rule with `outline-offset: -0.25rem` ensures focus rings on focusable children (typically buttons) don't get clipped by the media's `overflow: hidden`.
- **content_width ignored when bleed is true.** Bleed sets `inline-size: 100dvw; max-inline-size: none` — both overriding the `max-inline-size: var(--content-width)` declaration. Documented in the API table; merchants composing bleed + content_width get bleed sizing only.
- **`{{ block.shopify_attributes }}` emission.** On the outer wrapper.
- **Color-scheme override propagates to overlay content.** Setting `color_scheme` re-emits `--color-role-*` tokens scoped to the block; descendant blocks (overlay title/richtext/button) inherit the new scheme via the cascade.

## Locale keys

Schema strings under `blocks.media.*` (defined in `locales/en.default.schema.json` + `locales/fr.schema.json`):

- `blocks.media.name`
- `blocks.media.settings.media.content` (group header)
- `blocks.media.settings.media_type.{label,options.{image,video}}`
- `blocks.media.settings.image.label`, `blocks.media.settings.mobile_image.{label,info}`
- `blocks.media.settings.video.label`, `blocks.media.settings.mobile_video.{label,info}`
- `blocks.media.settings.video_mode.{label,options.{atmosphere,content}}`
- `blocks.media.settings.video_autoplay.{label,info}`
- `blocks.media.settings.video_controls.{label,options.{minimal,full}}`
- `blocks.media.settings.video_loop.label`
- `blocks.media.settings.layout.content` (group header)
- `blocks.media.settings.media_size.{label,info}`, `blocks.media.settings.mobile_media_size.{label,info}`
- `blocks.media.settings.bleed.{label,info}`
- `blocks.media.settings.image_fit.{label,info,options.{cover,contain}}`
- `blocks.media.settings.horizontal_alignment.{label,options.{start,center,end}}`
- `blocks.media.settings.vertical_alignment.{label,options.{start,center,end}}`
- `blocks.media.settings.content_width.{label,info}`
- `blocks.media.settings.gap.label`
- `blocks.media.settings.appearance.content` (group header)
- `blocks.media.settings.container_style.{label,info}`
- `blocks.media.settings.overlay_color.{label,info}`
- `blocks.media.settings.color_scheme.{label,info}`
- `blocks.media.settings.top_spacing.content` (group header)
- `blocks.media.settings.{mobile,desktop}_margin_block_start.label`
- `blocks.media.presets.media.{name,category}`

No runtime strings (the `<media-video>` element's a11y label propagates from the video snippet).

## Validation

Per `validation-contract.md` Tier 2 (theme-primitive).

- **Tier**: primitive (L1 block-backed; no sub-component half)
- **Page**: `sections/validation--primitive--media.liquid` + `templates/index.validation--primitive--media.json` (shipped)
- **API surface**:
  - **media_type × asset variation**: `image` with image set; `image` blank → placeholder; `video` with video set; `video` blank → placeholder
  - **Art direction**: both desktop + mobile assets set → modifier emitted; resize viewport shows mobile asset below 48rem
  - **media_size matrix**: each shipped entry (`fill`, ratios like `16/9` / `4/3` / `1/1`, relative like `60svh`, fixed like `400px`) — verify sizing modifier and var emission
  - **mobile_media_size override**: mobile entry differs from desktop → mobile applies below 48rem; desktop above
  - **Bleed**: with and without — verify `inline-size: 100dvw` applies when set; bleed inside a section vs inside a column track (off-center case) — second case visually drifts (documented footgun)
  - **image_fit**: `cover` (no modifier) vs `contain` (modifier + CSS override); video instances skip the setting
  - **horizontal_alignment / vertical_alignment × gap**: overlay content positioning matrix
  - **Overlay color**: blank (no overlay element) vs translucent black vs opaque accent (visible tint over media)
  - **container_style**: `card`, `outlined`, `elevated` — verify centralized rules apply from `layer-theme.css`
  - **color_scheme override**: media with scheme-2 inside scheme-1 section → overlay content (title/richtext/button) inherits scheme-2 tokens
  - **Overlay content (whitelisted blocks)**: title, richtext, button, group children in `<media-contents>` — verify positioning and alignment
- **Surface delegation**: image/video rendering itself is exercised at the `image`/`video` snippet level (L0); this page exercises the **media block's composition surface** (sizing, bleed, overlay, content placement, modifier emission).
- **Edge cases**:
  - `media_type: image` + `image` blank + no children → placeholder SVG only
  - `media_type: video` + `video` blank → placeholder SVG; video-only settings (autoplay, controls) are no-ops
  - `image_fit: contain` set + `media_type: video` switched → image-fit modifier doesn't apply (CSS rule conditioned on `image-fit:contain` which only emits in image mode)
  - Bleed inside a `1-3` columns track (narrower track) → visual drift (documented)
  - Overlay color set to `rgba(0,0,0,0)` → snippet skips emitting `<media-overlay>` (the explicit no-emit branch)
  - Empty `contents` → no `<media-contents>` element; modifier `has-children` absent
- **Visual showcase**: matrix sections per concern (sizing, bleed, overlay, alignment, scheme-override). Reader confirms each cell renders as configured.
- **Assertions** (prose; Playwright once installed):
  - Sizing instances have computed `aspect-ratio` or `block-size` matching the configured `media_size`
  - `sizing:fill` instances have `block-size: 100svh`
  - Bleed instances have `inline-size: 100dvw` and `margin-inline: calc(50% - 50dvw)`
  - `image-fit:contain` instances' inner `<img>` has `object-fit: contain`
  - `<media-overlay>` is present when `overlay_color` is non-blank non-transparent, absent otherwise
  - `<media-contents>`'s computed `justify-content` / `align-items` match the alignment settings
- **Unit scope**: none directly (Liquid + CSS only). The `<media-video>` element's JS lives in the video snippet's spec.

## Out of scope

- **Multiple media per block** — single image OR single video. Galleries or carousels are a separate primitive (`marquee` / future `gallery` block).
- **Bleed beyond the section's content cap** — same constraint as `group`/`columns`. Under Option A, bleed caps at `--content-width`. The current `100dvw` math escapes to the viewport edge; the planned subgrid migration (`subgrid-migration.md`) tightens this to the named-line grid model.
- **Bleed inside off-center column tracks** — known limitation (centered-ancestor assumption). The fix lives in the subgrid migration when section becomes a named-line grid.
- **Image lazy-loading / fetchpriority / decoding configuration** — owned by `snippets/image.liquid`; the media block doesn't expose these as block settings. Per-project tuning lives at the snippet level.
- **Video custom controls UI** — `video_controls: full` exposes browser-native controls. Custom-styled controls (skip, scrub, mute toggle) belong in a separate primitive or in per-project extensions to `video.liquid`.
- **Click-to-play / poster-as-cover privacy gate** — videos always render directly today. A privacy-gated variant would expose a `poster_only_until_click` setting (separate work).
- **Overlay-content scrolling inside media** — `<media-contents>` is `position: absolute; inset: 0` — fixed to the media's box. Long overlay content overflows; the design assumption is short heading + body + CTA only.

## Related

- Container patterns (sizing, bleed model, content cap, asymmetric responsive shapes): `.context/docs/container-patterns.md`
- Group spec (sibling flex container; share container_style + color_scheme + bleed conventions): `.context/specs/group.md`
- Container-style spec (centralized variant CSS in `layer-theme.css`): `.context/specs/container-style.md`
- Subgrid migration (planned future state — strict container-only bleed, named-line grid replaces today's negative-margin bleed): `.context/docs/subgrid-migration.md`
- Image spec (renderer for `media_type: image`): `.context/specs/image.md`
- Video spec (renderer for `media_type: video`): `.context/specs/video.md`
- Schema conventions (top-spacing pair, color-scheme override pattern, container-style pattern): `.context/docs/schema-conventions.md`
