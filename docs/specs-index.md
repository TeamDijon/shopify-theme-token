# Specs index

Specs for elements in the theme — shipped (retrofit) and planned. Organized by composition layer (see `.context/docs/composition-strategy.md`). Each spec describes the API, output shape, behavior, and validation surface per `validation-contract.md`.

Originally sourced from the EXPLORATION-2 inventory pass (May 2026); retrofits added as shipped elements get documented.

## Substrate

- [theme-color](./specs/theme-color.md) — named color tokens emitted as `--color-<handle>` in `:root`; scheme-role tokens (`--color-role-<role>`) live in a disjoint namespace *(shipped — retrofit)*
- [utility--color-contrast](./specs/utility--color-contrast.md) — two-choice contrast picker wrapping Liquid's `color_contrast` filter; echoes the higher-contrast reference between two candidates against a background *(shipped — retrofit)*
- [modifiers-manager](./specs/modifiers-manager.md) — class that reads and mutates the `data-modifiers` attribute on a target element; lazy-instantiated per theme-* element via `BaseComponent` + singleton on `documentElement` *(shipped — retrofit)*
- [container-style](./specs/container-style.md) — named container variant (card / outlined / elevated); handle drives a centralized `[data-modifiers*='container-style:<handle>']` rule in `layer-theme.css` scoped across `group` / `columns` / `media` *(shipped — retrofit)*

## Layer 0 — Snippets

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
- [button](./specs/button.md) — call-to-action primitive rendering `<a>` or `<button type="button">` depending on `link`; styled via the 3×3 `button_style` family/variant matrix; optional icon, content_width, top spacing *(shipped — retrofit)*
- [group](./specs/group.md) — flex container with direction / stack-below (container-query driven) / alignment / gap / bleed / container-style / color-scheme override; recursive composition via explicit whitelist of the 9 L1 block types *(shipped — retrofit)*

## Layer 2 — Presets

(none yet)

## Layer 3 — Framing-A sections

(none yet)

## Layer 4 — Framing-B sections

(none yet)
