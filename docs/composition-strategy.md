# Composition strategy

Every new UI need maps to one layer in the stack below — from the substrate up through preset compositions, and beyond to specialized sections when L2 can't express what's needed cleanly.

## Spec as source of truth

Every element ships from a spec at `.context/docs/specs/<name>.md` (template: `specs/_template.md`) — the functional source of truth for what the element does, its API, variations, and its validation suite (per `validation-contract.md`). This file says *where* each element fits; the spec says *what* the element does; `.context/rules/` and the other `.context/docs/` files carry the technical *how*. The end-to-end workflow from triage through validation lives in `spec-to-component.md`.

## Substrate

The configuration + utility layer everything else builds on — metaobjects (`theme_color`, `text_style`, `content_width`, …), color schemes, utility snippets, utility CSS rules in `core.css`, JS modules. Substrate styles raw HTML tags ambiently, so a bare `<h2>` renders per theme configuration without any per-element metadata.

Substrate is foundational, not composed — it sits outside the composition layers below. Its spec/validation tier (Tier 1, with sub-shapes for metaobject / utility snippet / utility CSS / utility JS) is defined in `validation-contract.md`. For substrate setup + consumption: `metaobject-definitions.md`, `design-system-metaobjects.md`, `architecture.md`.

## The composition layers

```
L2 — Preset on `section.liquid`
  Saved composition of theme blocks expressed as a preset entry in
  `sections/section.liquid`. No new Liquid code. The canonical
  ready-to-use surface for content-first sections.
  Examples: hero (media + group + title + button), USP strip
  (columns + group + icon + title), FAQ (title + disclosure repeat).

L1 — Theme block
  Merchant-facing schema wrapping ONE theme-primitive. Configurable
  and composable wherever a section accepts @theme children.
  Examples: title, richtext, button, media, group, columns,
  separator, spacer, embed.

L0 — Theme-primitive (snippet)
  Pure rendering helper. No schema. Two consumption forms — block-
  backed (renders the root of an L1 theme block) or sub-component
  (nested inside other primitives, blocks, or sections). Reusable
  from any consumer.
  Examples: utility--*, image, icon, video, star-rating, badge,
  price-with-compare, form-field; and the render side of every L1
  block.
```

The general theme ships L0–L2, plus specialized sections that earn their place there (see below).

## Beyond L2 — specialized section

When a section's needs exceed what L2 can express cleanly, the implementation route is a specialized section — a bespoke section file with its own schema, dynamic-data ingestion, or business logic. Free of theme-block constraints; can host `paginate`, dynamic data sources, and logic that spans the section. No merchant composability inside the section itself.

Token does not use private theme blocks (underscore-prefixed). The block-whitelist convention below makes the underscore mechanism unnecessary: a block that should only appear in one section lives in `blocks/` like any other, and only that section's schema lists it.

### Triggers favoring specialized over preset

A section earns a specialized treatment when one or more applies:

- **Statefulness needs** — a dynamic source on a leaf node has no graceful hide path; blocks can't conditionally vanish themselves cleanly
- **Repeater needs** — `paginate` doesn't propagate to nested blocks (collection grid is the canonical example)
- **Business-logic concentration** — too much state concentrated in one place for L2 to express (featured product)
- **Identity** — the section is a single configurable concept (FAQ, store-locator) rather than a composition of smaller blocks

The trigger applies whether the specialized section ships in Token's general theme (FAQ, collection grid, featured product) or per-project (cart-upsell, recently-viewed, store-specific layouts).

## Block whitelisting

Sections and container blocks (`group`, `columns`) declare which theme blocks they accept via an explicit list in the `blocks` schema array — no `@theme` wildcards, no underscore-prefixed private blocks. Visibility of a block in any given context is determined solely by inclusion in that context's whitelist.

Token's general theme whitelists the 9 shipped L1 blocks (`spacer`, `separator`, `title`, `richtext`, `button`, `media`, `embed`, `group`, `columns`) in `section.liquid`, `group`, and `columns`, plus `{ "type": "@app" }` for app block compatibility. Per-project specialized sections own their own whitelists, naming the blocks they compose plus any project-specific blocks they introduce.

Each L1 block spec carries a `Whitelisted by` field naming the sections and container blocks whose schemas include the block. Adding a new L1 block to the theme means updating each of those schemas in the same change — the spec is the checklist.

## Theme-primitives (Layer 0)

A theme-primitive interfaces over an HTML element or a composition with a set API. The structural axis that drives decisions is **consumption form**:

- **Block-backed** — the snippet is the root of an L1 theme block (schema `"tag": null`); emits `class="shopify-block shopify-block--<name>"` + `{{ block.shopify_attributes }}` + id + modifiers; styles via `.shopify-block--<name>`.
- **Sub-component** — nested inside other primitives, blocks, or sections; emits a clean `.<name>` root, no Shopify integration.

A secondary annotation — element primitive (wraps a single HTML tag) vs composite primitive (assembles multiple elements + logic with no single-tag equivalent) — is useful for cataloguing but doesn't drive structural decisions. Specs may record it.

Examples spanning both axes: `icon` = element + sub-component; `media` = composite + block-backed; `title` = element + block-backed; `star-rating` = composite + sub-component.

## Render vs inline

For developer-authored fixed content, inline raw HTML tags — they inherit substrate styling. A cart header writes `<h2 class="cart-title">Your cart</h2>`, not `{% render 'title' %}`.

Render a theme-primitive only when:
- The config layer is needed (as an L1 theme block, or a section exposing those settings)
- The primitive is a composite (`star-rating`, `media`, `pagination`) — no raw HTML equivalent exists to inline

Extract a shared snippet at 2+ consumers; below that, inline the markup in the single consumer.

## Decision flow

Bottom-up order:

0. **Substrate-only need?** New metaobject, utility snippet, CSS rule, or JS module. → Substrate. Spec at Tier 1.
1. **Fixed developer content using an existing primitive or raw element?** → No new layer. Inline the element or render the primitive — see Render vs inline above.
2. **Stateless visual unit a merchant should configure/add?** → **L0 + L1.** A new theme-primitive (snippet) wrapped in a theme block. Add the block to relevant whitelists (`section.liquid`, `group`, `columns`).
3. **Composition of existing primitives, no new logic?** → **L2.** Ship a preset in `sections/section.liquid`.
4. **Any of the "favoring specialized" triggers apply?** → **Beyond L2.** Author a specialized section with its own schema and whitelist.

Multiple "yes" at once means two layers — author one spec per layer added, on the same ticket, with the dependency order honored (L0 before its L1 wrapper, etc.).

## L0 without L1 — snippet-only primitives

A theme-primitive can ship as L0 alone, without a paired L1 block. The L1 block exists to expose configurable static content to merchants — but some primitives only make sense paired with dynamic data, where a standalone configurable block would be meaningless. These ship as L0 snippets consumed directly by specialized sections (Beyond L2). Earmarked primitives in this category:

- `disclosure` — `<details>/<summary>` markup. Consumed by a static FAQ section and a metaobject-driven FAQ section.
- `hotspot` — positioned overlay marker. Consumed by a shoppable lookbook section that needs product GIDs per hotspot.
- `marquee` — infinite horizontal scroll container. Consumed by sections fed by logo metaobjects, product feeds, or curated lists.

None of the three ship today; they will land alongside their first consumer.

## Existing layer mapping

| Layer | Shipped |
|---|---|
| Substrate | metaobjects (10 types + gradient), color schemes, `utility--*` snippets, `core.css`, JS modules (`base-component`, 4 managers, `utils`, `dom`, `core`) |
| L0 — Theme-primitive | shipped: `image`, `icon`, `video`, `skip-to-content`, `validation--*`; render side of every L1 block. earmarked specs: `star-rating`, `badge`, `price-with-compare`, `form-field`, `article-card`, `inventory-status`, `pagination`, `payment-icons-strip`, `tooltip` |
| L1 — Theme block | `title`, `richtext`, `button`, `media`, `group`, `columns`, `separator`, `spacer`, `embed` |
| L2 — Preset on `section.liquid` | `Section` (default empty composition) |
| Beyond L2 | *None shipped yet; FAQ, collection grid, featured product earmarked for general theme* |

## Related

- `.context/rules/block-convention.md` — theme block authoring (L1); block-backed snippet root contract; flat naming convention
- `.context/rules/section-convention.md` — standard vs specialized sections (L2 host vs Beyond-L2); explicit-whitelist schema convention
- `.context/rules/snippet-convention.md` — snippet structure (L0)
- `.context/docs/css-standards.md` — component-rooted CSS; `.shopify-block--<name>` (block-backed) vs `.<name>` (sub-component) roots
- `.context/docs/modifier-system.md` — `data-modifiers` attribute used on block-backed roots and `<theme-section>`
- `.context/docs/asset-loading.md` — file-vs-inline CSS/JS placement across consumer types
- `.context/docs/spec-to-component.md` — end-to-end workflow from triage through validation
- `.context/docs/validation-contract.md` — per-tier validation contract (substrate, primitive, preset, specialized section)
