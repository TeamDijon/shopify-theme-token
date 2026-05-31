# Specs index

Specs for elements in the theme — shipped (retrofit) and planned. Organized by composition layer (see `.context/docs/composition-strategy.md`). Each spec describes the API, output shape, behavior, and validation surface per `validation-contract.md`.

Originally sourced from the EXPLORATION-2 inventory pass (May 2026); retrofits added as shipped elements get documented.

## Substrate

- [theme-color](./specs/theme-color.md) — named color tokens emitted as `--color-<handle>` in `:root`; scheme-role tokens (`--color-role-<role>`) live in a disjoint namespace *(shipped — retrofit)*
- [utility--color-contrast](./specs/utility--color-contrast.md) — two-choice contrast picker wrapping Liquid's `color_contrast` filter; echoes the higher-contrast reference between two candidates against a background *(shipped — retrofit)*
- [modifiers-manager](./specs/modifiers-manager.md) — class that reads and mutates the `data-modifiers` attribute on a target element; lazy-instantiated per theme-* element via `BaseComponent` + singleton on `documentElement` *(shipped — retrofit)*
- [container-style](./specs/container-style.md) — named container variant (card / outlined / elevated); handle drives a centralized `[data-modifiers*='container-style:<handle>']` rule in `layer-theme.css` scoped across `group` / `columns` / `media` *(shipped — retrofit)*

## Layer 0 — Snippets

- [image](./specs/image.md) — responsive Shopify image renderer with optional mobile art direction (`<picture>` wrapping with mobile `<source>`); exposes loading / fetchpriority / preload knobs; two width ladders *(shipped — retrofit)*
- [video](./specs/video.md) — Shopify-hosted video renderer wrapping `<video>` in `<media-video>`; atmosphere vs content playback profiles; mp4 source extraction from `video.sources`; mobile art-direction via second `<source>` *(shipped — retrofit)*
- [icon](./specs/icon.md) — inline SVG icon loader from `assets/icon-*.svg` with dual-API (metaobject ref OR file_name string); injects `aria-hidden="true"` + optional `data-preset` (escaped); empty-on-missing via `utility--inline-asset` *(shipped — retrofit)*
- [star-rating](./specs/star-rating.md) — 5-star visual using `icon-star` full/half/empty presets *(planned)*
- [price-with-compare](./specs/price-with-compare.md) — current price + optional compare-at + optional save pill, with raw `data-*` for JS update path *(planned)*
- [inventory-status](./specs/inventory-status.md) — variant inventory state pill (in-stock / low-stock / pre-order / out-of-stock) with threshold + JS update path *(planned)*
- [pagination](./specs/pagination.md) — numbered (SEO-friendly) or load-more (JS-driven) pagination with shared markup contract *(planned)*
- [badge](./specs/badge.md) — generic tone-colored pill (label + optional icon), tint/solid styles driven by semantic color tokens *(planned)*
- [article-card](./specs/article-card.md) — blog article tile (image / date / title / excerpt / author) with pseudo-overlay whole-card link *(planned)*
- [form-field](./specs/form-field.md) — label + control + help + error unit (text-family / textarea / select / checkbox) with full ARIA wiring *(planned)*
- [payment-icons-strip](./specs/payment-icons-strip.md) — row of accepted payment-method icons from `shop.enabled_payment_types` *(planned)*
- [tooltip](./specs/tooltip.md) — popover-API toggletip (pointer / keyboard / touch), non-interactive content, JS-enhanced hover + placement *(planned)*

## Layer 1 — Theme blocks

- [rating](./specs/rating.md) — metafield-first rating display with override-checkbox safeguard; consumes `star-rating` L0; emits AggregateRating JSON-LD *(planned)*
- [spacer](./specs/spacer.md) — empty vertical-spacer block with fixed or breakpoint-paired sizing, optional `theme_color` background *(shipped — retrofit)*
- [separator](./specs/separator.md) — hairline `<hr>` divider with optional content_width cap and `theme_color`-driven line color (defaults to `--color-role-border`) *(shipped — retrofit)*
- [title](./specs/title.md) — heading primitive (`h1`–`h6` / `p`) with `text_style` override, optional leading icon, alignment, content_width cap, `theme_color` foreground *(shipped — retrofit)*
- [richtext](./specs/richtext.md) — long-form rich-text body wrapper always emitting the `prose` utility modifier; content_width drives readability width; `theme_color` foreground *(shipped — retrofit)*
- [button](./specs/button.md) — call-to-action primitive rendering `<a>` or `<button type="button">` depending on `link`; styled via the 3×3 `button_style` family/variant matrix; optional icon, content_width, top spacing *(shipped — retrofit)*
- [media](./specs/media.md) — image or video container with overlay-content support; sizing via `media_size` (fill/ratio/relative/fixed); art direction; bleed (with centered-ancestor footgun); image_fit cover/contain; container_style; color_scheme override; narrow overlay-content whitelist (`title`, `richtext`, `button`, `group`) *(shipped — retrofit)*
- [embed](./specs/embed.md) — third-party video iframe for YouTube and Vimeo; URL parsing for 7 supported shapes (incl. Vimeo unlisted-hash); lazy-loaded; sizing via shared `media_size` utility; editor-only diagnostic for unparseable URLs *(shipped — retrofit)*
- [group](./specs/group.md) — flex container with direction / stack-below (container-query driven) / alignment / gap / bleed / container-style / color-scheme override; recursive composition via explicit whitelist of the 9 L1 block types *(shipped — retrofit)*
- [columns](./specs/columns.md) — CSS Grid container with seven preset ratios (2 / 3 / 4 / 1-2 / 2-1 / 1-3 / 3-1); stack-below via `@container` queries against own width; sticky-track support for 2-track layouts; bleed (shared footgun); container_style; color_scheme override; recursive nesting *(shipped — retrofit)*

## Section host

- [section](./specs/section.md) — the merchant-composable section host (`sections/section.liquid`). Renders `<theme-section>` with the `theme-root` modifier; exposes the layout / content_width / block_rhythm / color_scheme settings; whitelists the 9 shipped L1 blocks + `@app`; hosts L2 presets via its `presets[]` schema array *(shipped — retrofit)*

## Layer 2 — Presets on `section.liquid`

Parked. Authoring + validation lands after L1 block validation hardens. The 4 existing `sections/validation--preset--*.liquid` scaffolds (`hero`, `content`, `columns-features`, `cta-banner`) remain on disk as composition references but are not tracked here until preset work resumes — see local `BACKLOG.md`.

## Beyond L2 — Specialized sections

Parked. Authoring + validation lands after substrate confidence is established (subgrid migration ships + L1 block validation hardens). Earmarked: `header`, `footer`, future `cart` / `faq` / `collection-grid` / `featured-product` — see local `BACKLOG.md`.
