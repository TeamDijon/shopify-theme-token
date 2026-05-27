# Composition strategy

Every new UI need maps to one layer in the stack below — from the design-system substrate up to specialized sections. Walk the decision flow before writing code for a new pattern.

## The foundation: substrate + HTML elements

Two layers sit below the five, applied ambiently.

**Supporting systems (the substrate).** Metaobjects (`theme_color`, `text_style`, `typeface`/`font`, `content_width`, `spacing`…), color schemes, and Shopify platform APIs. They apply with zero per-element config: a bare `<h2>Your cart</h2>` renders per theme configuration without metadata on the element. The bare-tag `text_style` binding (in `utility--css-variables`) styles `h1`–`h6`; `--color-*` variables and color-scheme values cascade in.

**HTML elements — the true primitives.** Because the substrate styles raw tags, an HTML element is usable on its own. `<h2 class="cart-title">Your cart</h2>` inherits design-system typography directly.

Token's Layer 0 units are therefore **theme-primitives**: an interface over an HTML element or over a composition.

## The five layers

```
Layer 4 — Specialized section (Framing B)
  Custom Liquid + schema; ingests metaobjects, products, or customer
  state; renders via snippets. Business logic, dynamic data, repeaters.
  Often per-project; typically forked from a sibling Layer 3.
  Examples: collection-bound FAQ, shoppable hotspot section,
  customer-bound recommendations carousel.

Layer 3 — Specialized section (Framing A)
  Section file with its own inline-block schema. Stateless content;
  merchant authors entries in the editor. Built for duplication into a
  Layer 4 variant.
  Examples: testimonials section, timeline section, static FAQ section.

Layer 2 — `section.liquid` preset
  Composition of existing theme blocks expressed as a preset JSON in
  `sections/section.liquid`. No new code.
  Examples: hero (media + group + title + button), USP strip
  (columns + group + icon + title).

Layer 1 — Theme block
  Merchant-facing schema wrapping ONE theme-primitive. Configuration +
  arrangement in the editor. Composable wherever a section accepts
  @theme children.
  Examples: title, richtext, button, media, group, columns, separator,
  spacer, embed.

Layer 0 — Theme-primitive (snippet)
  Interface over an element or a composition, with a set API. Pure
  rendering, no schema. Reusable from any consumer. Taxonomy below.
  Examples: utility--*, image, icon, video, star-rating, badge,
  price-with-compare, form-field; and the render-side of every block.
```

L3 vs L4 is determined by **statefulness**: inline-authored and stateless → Framing A; dynamic-data or business-logic → Framing B.

## Theme-primitives (Layer 0)

Classify each on two independent axes.

**Axis A — what it interfaces:**
- **Element primitive** — wraps a single HTML element, adding the theme's config layer. `title`→`<h2>`, `button`→`<a>`/`<button>`, `separator`→`<hr>`, `icon`→`<svg>`, `richtext`/`group`/`columns`→`<div>`.
- **Composite primitive** — assembles multiple elements + logic into a unit with no single-tag equivalent. `star-rating`, `price-with-compare`, `media`, `pagination`, `article-card`, `form-field`, `tooltip`, `badge`.

**Axis B — how it's consumed:**
- **Block-backed** — the snippet is a theme-block root (schema `"tag": null`); emits `class="shopify-block shopify-block--<name>"` + `{{ block.shopify_attributes }}` + id + modifiers; styles via `.shopify-block--<name>`.
- **Sub-component** — nested inside other blocks/sections; emits a clean `.<name>` root, no Shopify integration.

The axes are independent: `icon` = element + sub-component; `media` = composite + block-backed; `title` = element + block-backed; `star-rating` = composite + sub-component.

## Render vs inline

Determined by Axis A:

- **Element primitive** — inline the raw element for fixed, developer-authored content; it inherits substrate styling. Render the theme-primitive only when the config layer is needed: as a theme block, or a section exposing those settings. A cart header writes `<h2 class="cart-title">Your cart</h2>`, not `{% render 'title' %}`.
- **Composite primitive** — always render; no raw equivalent exists to inline. Extract a shared snippet at 2+ consumers; below that, inline its markup in the single consumer.

Inline when writing an element; render when the alternative is duplicating logic.

## Decision flow

Walk the stack bottom-up:

0. **Fixed content from an existing element or primitive?** No new layer. Inline the HTML element (element primitive) or render the composite primitive. Proceed downward only if the merchant must configure it or it needs new structure.
1. **Stateless visual unit a merchant should configure/add** (one element, one set of inputs, no repetition)? → **Layer 1.** Wrap a theme-primitive (existing or new) in a theme block.
2. **Composition of existing primitives, no new logic?** → **Layer 2.** Ship a preset in `sections/section.liquid`.
3. **Repeating shape (N items × structured fields) curated per page?** → **Layer 3 (Framing A).** Specialized section with its own inline-block schema; keep the data-rendering boundary clean (see below).
4. **Content ingests dynamic data** (metaobject lists, product collections, customer state)? → **Layer 4 (Framing B).** Specialized section that fetches data and loops via snippets. Often per-project.

Multiple "yes" at once means two layers — split the work.

## Layer 3 → 4 duplication constraint

Layer 3 sections are duplication-friendly: producing the Layer 4 variant means forking the file, renaming it, swapping the data source, and adding the business logic with localized changes — not a refactor.

- **Schema and rendering stay separate.** The Liquid that iterates `section.blocks` is one contained chunk, not interleaved with business logic. A Framing B fork replaces this chunk with a metaobject loop.
- **Per-item rendering goes through a snippet.** The section orchestrates; a snippet renders the item. The same snippet serves both the Framing A and Framing B variants.
- **No business logic in the inline-block flow.** Pricing, availability, collection filtering, customer-state branching belong in Layer 4. Their presence means the section has graduated.

## Snippet vs theme block

A pattern can earn a theme-primitive without earning a theme block. A block exposes the primitive as merchant-composable, which limits it to static content — patterns whose real use needs dynamic data ship as theme-primitives consumed by Layer 3/4 sections:

- `disclosure` — `<details>/<summary>` markup + rotation CSS. Consumed by a static FAQ section (Layer 3) and a collection-bound FAQ section (Layer 4).
- `hotspot` — positioned overlay marker. Consumed by a shoppable lookbook section that needs product GIDs per hotspot.
- `marquee` — infinite horizontal scroll container. Consumed by sections fed by logo metaobjects, product feeds, or curated lists.
- Table-style display, carousel, grouped accordion — same shape.

## Existing layer mapping

| Layer | Shipped |
|---|---|
| 0 — Theme-primitive | `utility--*`, `image`, `icon`, `video`, `skip-to-content`, `validation--*`; render-side of every block (`title`, `button`, …) |
| 1 — Theme block | `title`, `richtext`, `button`, `media`, `group`, `columns`, `separator`, `spacer`, `embed` |
| 2 — `section.liquid` preset | `Section` (default empty composition) |
| 3 — Specialized section (Framing A) | *None shipped yet* |
| 4 — Specialized section (Framing B) | *None shipped yet — typically per-project* |

## Related

- `.context/rules/block-convention.md` — theme block authoring (Layer 1); block-backed snippet root contract
- `.context/rules/section-convention.md` — standard vs specialized sections (Layer 2 vs 3/4)
- `.context/rules/snippet-convention.md` — snippet structure (Layer 0)
- `.context/docs/css-standards.md` — component-rooted CSS; `.shopify-block--<name>` (block-backed) vs `.<name>` (sub-component) roots
