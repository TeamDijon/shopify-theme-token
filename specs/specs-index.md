# Specs index

Specs for elements in the theme — shipped (retrofit) and planned. Organized by composition layer (see `.context/docs/composition-strategy.md`). Each spec describes the API, output shape, behavior, and validation surface per `validation-contract.md`.

Originally sourced from the EXPLORATION-2 inventory pass (May 2026); retrofits added as shipped elements get documented.

## Substrate

- theme-events — typed cross-component event bus (Bucket B dependency). `CartUpdateEvent` / `VariantUpdateEvent` carrying `detail.resource` + affected `sections`; deferred from `events-manager` (which covers add/remove of platform listeners only) and `modifiers-manager` (out-of-scope deferral). Lands when the dynamic-runtime cluster ships *(planned)*

## Layer 0 — Snippets


## Layer 1 — Theme blocks


## Section host


## Layer 2 — Presets on `section.liquid`

Parked. Authoring + validation lands after L1 block validation hardens. The 4 existing `sections/validation--preset--*.liquid` scaffolds (`hero`, `content`, `columns-features`, `cta-banner`) remain on disk as composition references but are not tracked here until preset work resumes — see local `BACKLOG.md`.

## Beyond L2 — Specialized sections

Parked. Authoring + validation lands after substrate confidence is established (subgrid migration ships + L1 block validation hardens). Earmarked: `header`, `footer`, future `cart` / `faq` / `collection-grid` / `featured-product` — see local `BACKLOG.md`.
