# Composition strategy

Every new UI need maps to one layer in the stack below — from the substrate up through preset compositions, and beyond to specialized sections when L2 can't express what's needed cleanly.

## Spec as source of truth

Every element ships from a spec at `.context/specs/<name>.md` (template: `specs/_template.md`) — the functional source of truth for what the element does, its API, variations, and its validation suite (per `validation-contract.md`). This file says *where* each element fits; the spec says *what* the element does; `.context/rules/` and the other `.context/docs/` files carry the technical *how*. The end-to-end workflow from triage through validation lives in `spec-to-component.md`.

## Substrate

The configuration + utility layer everything else builds on — metaobjects (`theme_color`, `text_style`, `content_width`, …), color schemes, utility snippets, utility CSS rules in `assets/layer-*.css`, JS modules. Substrate styles raw HTML tags ambiently, so a bare `<h2>` renders per theme configuration without any per-element metadata.

Substrate is foundational, not composed — it sits outside the composition layers below. Its spec/validation tier (Tier 1, with sub-shapes for metaobject / utility snippet / utility CSS / utility JS) is defined in `validation-contract.md`. For substrate setup + consumption: `metaobject-definitions.md`, `design-system-metaobjects.md`, `architecture.md`.

## The composition layers

```
L2 — Preset on `section.liquid`
  Saved composition of theme blocks expressed as a preset entry in
  `sections/section.liquid`. No new Liquid code. The canonical
  ready-to-use surface for content-first sections.
  Examples: hero (media + group + title + button), USP strip
  (columns + group + icon + title), FAQ (title + several disclosure blocks).

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

## L2 — presets

A preset is a saved composition of theme blocks, expressed as a preset entry in `sections/section.liquid` — no new Liquid code.

**Discoverability.** Each preset carries a distinct name and a `category` key for picker grouping, drawn from the enum `banners` / `content` / `feature` / `layout` (attention surfaces / editorial bodies / repeating showcases / structural block presets). A generic section with no preset reads as an unlabeled "Section" in the editor, so the preset name and category carry the section's merchant-facing identity.

**Portability.** Presets travel across stores. A `"type": "metaobject"` setting stores its value as the entry **handle**, not a store-scoped GID (see `design-system-metaobjects.md` § Storing a metaobject reference value). A handle from Token's seed catalog (`content_width: reading`, `button_style: solid-primary`, a `color_scheme` handle, …) resolves on any seeded store, so it may be baked into a preset. A handle outside the seed catalog — a per-store custom entry — won't resolve elsewhere; ship it unset so it falls through to the substrate default. The shipped presets currently leave metaobject pickers unset (conservative: every store renders, even before its catalog is tuned); baking seed-catalog handles is the richer-default alternative.

## Beyond L2 — specialized section

When a section's needs exceed what L2 can express cleanly, the implementation route is a specialized section — a bespoke section file with its own schema, dynamic-data ingestion, or business logic. Free of theme-block constraints; can host `paginate`, dynamic data sources, and logic that spans the section. No merchant composability inside the section itself.

Token does not use private theme blocks (underscore-prefixed). The block-whitelist convention below makes the underscore mechanism unnecessary: a block that should only appear in one section lives in `blocks/` like any other, and only that section's schema lists it.

### Triggers favoring specialized over preset

Three **hard triggers** force a specialized section — none can live inside a theme block:

- **Dynamic-source binding** — a Shopify dynamic source on a leaf has no graceful hide path; blocks can't conditionally vanish themselves cleanly. Client-side interactivity (tab toggle, accordion, carousel index) is a custom element at home in a block; only a bound dynamic *source* trips this trigger.
- **Pagination** — `paginate` doesn't propagate to nested blocks (the main collection grid is canonical). A bounded `limit:` loop is not pagination and does not trip this.
- **Business-logic concentration** — too much state concentrated in one place for composition to express (featured product).

A hard trigger applies whether the section ships in Token's general theme (collection grid, featured product) or per-project (cart-upsell, recently-viewed, store-specific layouts).

**Identity** — a single configurable concept (FAQ, store-locator) rather than a composition — is a *soft* signal, not a hard trigger. It marks a discrete unit but does not force a section; an identity unit carrying no hard trigger can ship as an L1 composite (below).

### Abstracting an identity unit into an L1 composite

An identity unit with no hard trigger ships as a composite L0 + L1 block rather than a specialized section when **composability is the point** — when a merchant needs it placed *within* a layout (inside `columns` / `group`, beside other content), which a section cannot do.

The enabling shape: the unit's configurable data lives in **settings** (e.g. a `collection_list`), not in child blocks. Child blocks render in one contiguous pass; a setting loops any number of times, so a single block can emit one source into separated DOM regions (a tab list and its panels) — child-block composition cannot. The composite L0 renders the internal tree; nested data rows render via L0 snippets (`render 'product-card'`), not `content_for` (which renders merchant blocks).

The block carries a **frame-shed API**: its container supplies color scheme, content width, padding, alignment, and rhythm, so it exposes only its essence — placing it inside a container both unlocks composition and sheds the framing settings a standalone section must re-declare.

Keep the unit a specialized section when a hard trigger applies, when it always stands alone as a full section (a block then buys only weight), or when its styling needs section breakout (full-bleed coordinated with content, sticky regions, overlapping layers); contained-flow styling fits a block. `tabbed-collections` is the worked case: discrete identity, no hard trigger (bounded `limit:`, settings-sourced collections, client-side tab state), composable beside `media` inside `columns`.

## Block whitelisting

Sections and container blocks (`group`, `columns`, `media`) declare which theme blocks they accept via an explicit list in the `blocks` schema array — no `@theme` wildcards, no underscore-prefixed private blocks. Visibility of a block in any given context is determined solely by inclusion in that context's whitelist.

Token's general theme whitelists the 9 shipped L1 blocks (`spacer`, `separator`, `title`, `richtext`, `button`, `media`, `embed`, `group`, `columns`) in `section.liquid`, `group`, and `columns`, plus `{ "type": "@app" }` for app block compatibility. The `media` block carries a narrower whitelist (`title`, `richtext`, `button`, `group`) for hero-style overlay content. Per-project specialized sections own their own whitelists, naming the blocks they compose plus any project-specific blocks they introduce.

Each L1 block spec carries a `Whitelisted by` field naming the sections and container blocks whose schemas include the block. Adding a new L1 block to the theme means updating each of those schemas in the same change — the spec is the checklist.

## Theme-primitives (Layer 0)

A theme-primitive interfaces over an HTML element or a composition with a set API. The structural axis that drives decisions is **consumption form**:

- **Block-backed** — the snippet is the root of an L1 theme block (schema `"tag": null`); emits `class="shopify-block shopify-block--<name>"` + `{{ block.shopify_attributes }}` + id + modifiers; styles via `.shopify-block--<name>`.
- **Sub-component** — nested inside other primitives, blocks, or sections; emits a clean `.<name>` root, no Shopify integration.

A secondary annotation — element primitive (wraps a single HTML tag) vs composite primitive (assembles multiple elements + logic with no single-tag equivalent) — is useful for cataloguing but doesn't drive structural decisions. Specs may record it.

Examples spanning both axes: `icon` = element + sub-component; `media` = composite + block-backed; `title` = element + block-backed; `star-rating` = composite + sub-component.

## Leaf-vs-wrapped composition

Theme-section is a parametrizable implicit container — its `layout` setting picks a preset (`column` / `row` / `columns_N`) that bundles theme defaults for direction, gap, and stack-below. Two composition shapes for the same layout outcome:

- **Leaf-only** — section picks the layout preset; merchant adds blocks directly under the section. The implicit container provides the composition. Saves one nesting level. Fits the section's primary composition matching one of the layout presets.
- **Wrapped** — merchant adds a `group` / `columns` block as the first (or only) child of an `column`-layout section, and that wrapper takes over composition. Fits nested composition (a row of columns where each column has its own children), per-wrapper customization (specific gap, color-scheme override on a subset), or container-style variants on a sub-region.

Both compositions are first-class. Merchant-visible composition targets depth ≤3 (section → container → leaf); the block whitelist permits deeper manual nesting, but presets ship no deeper, and a need that requires it routes to a specialized section. The two are equivalent in vertical rhythm for matching layout choices; choose by what's needed beyond the rhythm. See `.context/docs/theme-root.md` § Leaf-vs-wrapped composition equivalence.

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
2. **Visual unit a merchant should configure/add, with no hard trigger?** → **L0 + L1.** A theme-primitive (snippet) — atomic or composite — wrapped in a theme block. Client-side interactivity (tabs, accordion, carousel) stays in the block; for a composite identity unit, see Abstracting an identity unit into an L1 composite. Add the block to relevant whitelists (`section.liquid`, `group`, `columns`).
3. **Composition of existing primitives, no new logic?** → **L2.** Ship a preset in `sections/section.liquid`.
4. **Any hard trigger (dynamic-source binding, pagination, business-logic concentration)?** → **Beyond L2.** Author a specialized section with its own schema and whitelist.

Multiple "yes" at once means two layers — author one spec per layer added, on the same ticket, with the dependency order honored (L0 before its L1 wrapper, etc.).

## L0 without L1 — dynamic-data leaves

A theme-primitive can ship as L0 alone, without a paired L1 block, when it is a leaf whose content resolves only against dynamic data — a standalone configurable block would have nothing to configure, since the content comes from a variant, a `paginate` object, an article, or shop state. These ship as L0 snippets consumed directly by specialized sections (Beyond L2). Primitives in this category:

- `price-with-compare` — current + compare-at price; reads variant fields.
- `inventory-status` — stock-state pill; reads variant inventory.
- `pagination` — page navigation; reads a `paginate` object.
- `article-card` — blog tile; reads an article.

A *composite container* primitive never qualifies here — it always has a curated static form (a merchant fills it with chosen children), so it earns an L1 container block whatever its dynamic incarnation. A container primitive earns its L1 form when its first curated consumer appears, and its data-fed form when its first dynamic section appears; `hotspot` and `marquee` exist as L0 with neither.

## Existing layer mapping

| Layer | Shipped |
|---|---|
| Substrate | metaobjects (11 types — `theme_color`, `gradient`, `typeface`, `font`, `text_style`, `content_width`, `icon`, `button_style`, `container_style`, `media_size`, `spacing`), color schemes, `utility--*` snippets, `layer-*.css` (per-layer substrate CSS files), JS modules (`base-component`, 4 managers, `utils`, `dom`, `core`) |
| L0 — Theme-primitive | shipped: `image`, `icon`, `video`, `skip-to-content`, `validation--*`; render side of every L1 block. earmarked specs: `star-rating`, `badge`, `price-with-compare`, `product-card`, `form-field`, `article-card`, `inventory-status`, `pagination`, `payment-icons-strip`, `tooltip`; container primitives `hotspot`, `marquee` (awaiting first consumer) |
| L1 — Theme block | shipped: `title`, `richtext`, `button`, `media`, `group`, `columns`, `separator`, `spacer`, `embed`. earmarked: `disclosure` (merchant-authored collapsibles; a FAQ section that iterates a metaobject feed is Beyond-L2), `tabbed-collections` (composite identity unit abstracted to L1 — see Abstracting an identity unit into an L1 composite) |
| L2 — Preset on `section.liquid` | `Section` (default empty composition) |
| Beyond L2 | None shipped yet. Earmarked for the general theme: header, footer, announcement bar, main-product, main-collection (grid + pagination), cart, search, blog/article, 404, customer templates, metaobject-driven FAQ, featured product — chrome and template-bound sections by platform nature, the rest by a hard trigger. Specialized sections are the larger half of a production theme by section count; composition (L0–L2) owns the editorial/marketing surface. |

## Related

- `.context/docs/theme-root.md` — `theme-root` modifier contract, layout enum, leaf-vs-wrapped equivalence, rhythm scope
- `.context/rules/block-convention.md` — theme block authoring (L1); block-backed snippet root contract; flat naming convention
- `.context/rules/section-convention.md` — standard vs specialized sections (L2 host vs Beyond-L2); explicit-whitelist schema convention
- `.context/rules/snippet-convention.md` — snippet structure (L0)
- `.context/docs/css-standards.md` — component-rooted CSS; `.shopify-block--<name>` (block-backed) vs `.<name>` (sub-component) roots
- `.context/docs/modifier-system.md` — `data-modifiers` attribute used on block-backed roots and `<token-section>`
- `.context/docs/asset-loading.md` — file-vs-inline CSS/JS placement across consumer types
- `.context/docs/spec-to-component.md` — end-to-end workflow from triage through validation
- `.context/docs/validation-contract.md` — per-tier validation contract (substrate, primitive, preset, specialized section)
