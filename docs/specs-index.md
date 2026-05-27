# Specs index

Forward-looking specs for ECOM elements not yet implemented in the theme. Organized by composition layer (see `.context/docs/composition-strategy.md`). Each spec describes the API, output shape, and behavior contract that will drive implementation.

Sourced from the EXPLORATION-2 inventory pass (May 2026).

## Layer 0 — Snippets

- [star-rating](./specs/star-rating.md) — 5-star visual using `icon-star` full/half/empty presets
- [price-with-compare](./specs/price-with-compare.md) — current price + optional compare-at + optional save pill, with raw `data-*` for JS update path
- [inventory-status](./specs/inventory-status.md) — variant inventory state pill (in-stock / low-stock / pre-order / out-of-stock) with threshold + JS update path
- [pagination](./specs/pagination.md) — numbered (SEO-friendly) or load-more (JS-driven) pagination with shared markup contract
- [badge](./specs/badge.md) — generic tone-colored pill (label + optional icon), tint/solid styles driven by semantic color tokens
- [article-card](./specs/article-card.md) — blog article tile (image / date / title / excerpt / author) with pseudo-overlay whole-card link
- [form-field](./specs/form-field.md) — label + control + help + error unit (text-family / textarea / select / checkbox) with full ARIA wiring
- [payment-icons-strip](./specs/payment-icons-strip.md) — row of accepted payment-method icons from `shop.enabled_payment_types`
- [tooltip](./specs/tooltip.md) — popover-API toggletip (pointer / keyboard / touch), non-interactive content, JS-enhanced hover + placement

## Layer 1 — Theme blocks

(none yet)

## Layer 2 — Presets

(none yet)

## Layer 3 — Framing-A sections

(none yet)

## Layer 4 — Framing-B sections

(none yet)
