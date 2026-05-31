# Specs index

Specs for elements in the theme — shipped (retrofit) and planned. Organized by composition layer (see `.context/docs/composition-strategy.md`). Each spec describes the API, output shape, behavior, and validation surface per `validation-contract.md`.

Originally sourced from the EXPLORATION-2 inventory pass (May 2026); retrofits added as shipped elements get documented.

## Substrate

- [theme-color](./theme-color.md) — named color tokens emitted as `--color-<handle>` in `:root`; scheme-role tokens (`--color-role-<role>`) live in a disjoint namespace *(shipped — retrofit)*
- [utility--css-variables](./utility--css-variables.md) — the design-system CSS variable emitter; five domains (theme palette, gradients, color-scheme role tokens, text-style typography + base aliases, gutter spacing) emitted into `:root` and per-scheme rule blocks *(shipped — retrofit)*
- [utility--color-contrast](./utility--color-contrast.md) — two-choice contrast picker wrapping Liquid's `color_contrast` filter; echoes the higher-contrast reference between two candidates against a background *(shipped — retrofit)*
- [base-component](./base-component.md) — custom-element foundation class extending `HTMLElement`; lazy-instantiates the four manager subsystems (events, observers, cache, modifiers) and auto-clears them on disconnect; registered directly as `<token-section>` and subclassed by future specialized sections *(shipped — retrofit)*
- [text_style](./text_style.md) — reusable typography style metaobject; entries emit `--<handle>-font-*` variables + a selector rule binding them; `h1`–`h6` handles auto-bind to bare tags; one entry (`base_text_style` setting) emits `--base-*` aliases consumed by the body rule *(shipped — retrofit)*
- [gradient](./gradient.md) — scheme-adaptive linear gradient metaobject; angle + two scheme-role endpoints emit one `--gradient-<handle>` declaration whose stops re-resolve per color scheme; `background` handle reserved for the color-scheme system *(shipped — retrofit)*
- [design-constants](./design-constants.md) — scheme-independent CSS-variable constants in `layer-base.css` (z-index scale, motion durations + easings, focus-ring metrics, border-radius scale); plus the cascade-layer declaration and view-transition opt-in *(shipped — retrofit)*
- [modifiers-manager](./modifiers-manager.md) — class that reads and mutates the `data-modifiers` attribute on a target element; lazy-instantiated per theme-* element via `BaseComponent` + singleton on `documentElement` *(shipped — retrofit)*
- [container-style](./container-style.md) — named container variant (card / outlined / elevated); handle drives a centralized `[data-modifiers*='container-style:<handle>']` rule in `layer-theme.css` scoped across `group` / `columns` / `media` *(shipped — retrofit)*

## Layer 0 — Snippets

- [image](./image.md) — responsive Shopify image renderer with optional mobile art direction (`<picture>` wrapping with mobile `<source>`); exposes loading / fetchpriority / preload knobs; two width ladders *(shipped — retrofit)*
- [video](./video.md) — Shopify-hosted video renderer wrapping `<video>` in `<media-video>`; atmosphere vs content playback profiles; mp4 source extraction from `video.sources`; mobile art-direction via second `<source>` *(shipped — retrofit)*
- [icon](./icon.md) — inline SVG icon loader from `assets/icon-*.svg` with dual-API (metaobject ref OR file_name string); injects `aria-hidden="true"` + optional `data-preset` (escaped); empty-on-missing via `utility--inline-asset` *(shipped — retrofit)*
- [star-rating](./star-rating.md) — 5-star visual using `icon-star` full/half/empty presets; resolves a numeric 0–5 rating into per-star presets via 0.5 increments; carries its own SR-only label *(planned)*
- [price-with-compare](./price-with-compare.md) — current price + optional compare-at (strikethrough) + optional save pill; emits raw cents + currency ISO in `data-*` for a JS update path on variant change; SR-only label combines the price story *(planned)*
- [inventory-status](./inventory-status.md) — variant inventory state pill (in-stock / low-stock / pre-order / out-of-stock); resolves four states from Shopify variant fields, emits `data-modifiers="state:<value>"`, colors per state from theme palette + scheme muted token *(planned)*
- [pagination](./pagination.md) — two-mode pagination: numbered (SEO-friendly anchors, `<nav>` landmark, ellipsis-collapse window) or load-more (button + `aria-live` progress, JS append via `pagination.js`); shared `data-modifiers="type:<mode>"` styling surface *(planned)*
- [badge](./badge.md) — generic tone-colored pill (label + optional icon); 6 tones (neutral / success / warning / error / info / accent — mixed palette + scheme-role sourcing) × 2 styles (tint via `color-mix`, solid); per-tone CSS centralized in the snippet's stylesheet *(planned)*
- [article-card](./article-card.md) — blog article tile (image / date / title / excerpt / author) with `::after` pseudo-overlay making the whole card clickable; opt-in line-clamp via `excerpt-clamp` modifier; localized date + responsive image *(planned)*
- [form-field](./form-field.md) — label + control + help + error unit (text-family / textarea / select / checkbox) with full ARIA wiring *(planned)*
- [payment-icons-strip](./payment-icons-strip.md) — row of accepted payment-method icons from `shop.enabled_payment_types` *(planned)*
- [tooltip](./tooltip.md) — popover-API toggletip (pointer / keyboard / touch), non-interactive content, JS-enhanced hover + placement *(planned)*

## Layer 1 — Theme blocks

- [rating](./rating.md) — metafield-first rating display with override-checkbox safeguard; consumes `star-rating` L0; emits AggregateRating JSON-LD *(planned)*
- [spacer](./spacer.md) — empty vertical-spacer block with fixed or breakpoint-paired sizing, optional `theme_color` background *(shipped — retrofit)*
- [separator](./separator.md) — hairline `<hr>` divider with optional content_width cap and `theme_color`-driven line color (defaults to `--color-role-border`) *(shipped — retrofit)*
- [title](./title.md) — heading primitive (`h1`–`h6` / `p`) with `text_style` override, optional leading icon, alignment, content_width cap, `theme_color` foreground *(shipped — retrofit)*
- [richtext](./richtext.md) — long-form rich-text body wrapper always emitting the `prose` utility modifier; content_width drives readability width; `theme_color` foreground *(shipped — retrofit)*
- [button](./button.md) — call-to-action primitive rendering `<a>` or `<button type="button">` depending on `link`; styled via the 3×3 `button_style` family/variant matrix; optional icon, content_width, top spacing *(shipped — retrofit)*
- [media](./media.md) — image or video container with overlay-content support; sizing via `media_size` (fill/ratio/relative/fixed); art direction; bleed (with centered-ancestor footgun); image_fit cover/contain; container_style; color_scheme override; narrow overlay-content whitelist (`title`, `richtext`, `button`, `group`) *(shipped — retrofit)*
- [embed](./embed.md) — third-party video iframe for YouTube and Vimeo; URL parsing for 7 supported shapes (incl. Vimeo unlisted-hash); lazy-loaded; sizing via shared `media_size` utility; editor-only diagnostic for unparseable URLs *(shipped — retrofit)*
- [group](./group.md) — flex container with direction / stack-below (container-query driven) / alignment / gap / bleed / container-style / color-scheme override; recursive composition via explicit whitelist of the 9 L1 block types *(shipped — retrofit)*
- [columns](./columns.md) — CSS Grid container with seven preset ratios (2 / 3 / 4 / 1-2 / 2-1 / 1-3 / 3-1); stack-below via `@container` queries against own width; sticky-track support for 2-track layouts; bleed (shared footgun); container_style; color_scheme override; recursive nesting *(shipped — retrofit)*

## Section host

- [section](./section.md) — the merchant-composable section host (`sections/section.liquid`). Renders `<token-section>` with the `theme-root` modifier; exposes the layout / content_width / block_rhythm / color_scheme settings; whitelists the 9 shipped L1 blocks + `@app`; hosts L2 presets via its `presets[]` schema array *(shipped — retrofit)*

## Layer 2 — Presets on `section.liquid`

Parked. Authoring + validation lands after L1 block validation hardens. The 4 existing `sections/validation--preset--*.liquid` scaffolds (`hero`, `content`, `columns-features`, `cta-banner`) remain on disk as composition references but are not tracked here until preset work resumes — see local `BACKLOG.md`.

## Beyond L2 — Specialized sections

Parked. Authoring + validation lands after substrate confidence is established (subgrid migration ships + L1 block validation hardens). Earmarked: `header`, `footer`, future `cart` / `faq` / `collection-grid` / `featured-product` — see local `BACKLOG.md`.
