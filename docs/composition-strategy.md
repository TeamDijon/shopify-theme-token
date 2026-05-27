# Composition strategy

Token assigns every new UI need to a layer in a stack that runs from the design-system substrate up to specialized sections. This is the decision flow to run *before* writing code for a new pattern — it prevents the common failure modes: building a theme block for something that's actually a snippet, rendering a heavy snippet where a raw HTML element would do, or building a specialized section for something already expressible as a composition of primitives.

## The foundation: substrate + HTML elements

Below the five layers sits the foundation that makes them work.

**Supporting systems (the substrate).** Metaobjects (`theme_color`, `text_style`, `typeface`/`font`, `content_width`, `spacing`…), color schemes, and Shopify platform APIs. Their defining property is that they are **ambient and zero-config**: a bare `<h2>Your cart</h2>` renders correctly per theme configuration with *no* metadata on the element. The bare-tag `text_style` binding (in `utility--css-variables`) styles `h1`–`h6` automatically; `--color-*` variables and color-scheme inheritance cascade in.

**HTML elements — the true primitives.** Because the substrate styles raw tags ambiently, an HTML element is itself a usable primitive. Writing `<h2 class="cart-title">Your cart</h2>` in a bespoke component is not a fallback — it is the correct move for fixed, developer-authored content, and it inherits design-system typography for free.

This is why "inline the element" is a first-class composition choice, not a workaround — and why Token's Layer 0 units are more precisely **theme-primitives**: an interface layered *over* the real primitive (an element) or *over* a composition.

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
  `sections/section.liquid`. No new code. The archetype is just a
  recipe of primitives.
  Examples: hero (media + group + title + button), USP strip
  (columns + group + icon + title).

Layer 1 — Theme block
  Merchant-facing schema wrapping ONE theme-primitive. Gives the merchant
  configuration + arrangement power in the editor. Composable wherever a
  section accepts @theme children.
  Examples: title, richtext, button, media, group, columns, separator,
  spacer, embed.

Layer 0 — Theme-primitive (snippet)
  Token's interface over an element or a composition, with a set API.
  Pure rendering, no schema. Reusable from any consumer. See taxonomy below.
  Examples: utility--*, image, icon, video, star-rating, badge,
  price-with-compare, form-field; and the render-side of every block.
```

The line between L3 and L4 is **statefulness / data source**, not the block mechanism a section happens to use: inline-authored & stateless → Framing A; dynamic-data & business-logic → Framing B.

## Theme-primitives (Layer 0) in depth

A theme-primitive is Token's interface over something more primitive, exposing a set API. Classify each along two independent axes.

**Axis A — what it interfaces:**
- **Element primitive** — wraps a single HTML element, adding the theme's config layer. `title`→`<h2>`, `button`→`<a>`/`<button>`, `separator`→`<hr>`, `icon`→`<svg>`, `richtext`/`group`/`columns`→`<div>`. A raw-tag counterpart exists underneath.
- **Composite primitive** — assembles multiple elements + logic into a unit with no single-tag equivalent. `star-rating`, `price-with-compare`, `media`, `pagination`, `article-card`, `form-field`, `tooltip`, `badge`.

**Axis B — how it's consumed:**
- **Block-backed** — the snippet *is* a theme-block root (schema `"tag": null`), so it emits `class="shopify-block shopify-block--<name>"` + `{{ shopify_attributes }}` + id + modifiers, and styles via `.shopify-block--<name>`.
- **Sub-component** — nested inside other blocks/sections; emits a clean `.<name>` root, no Shopify integration.

The axes are independent: `icon` = element + sub-component; `media` = composite + block-backed; `title` = element + block-backed; `star-rating` = composite + sub-component.

## Render vs inline

When a consumer needs a piece of UI, the choice between rendering a theme-primitive and inlining markup follows directly from Axis A:

- **Element primitive** → there's a raw-tag escape hatch. **Inline** the element for fixed, developer-authored content (it inherits the substrate's styling). **Render** the theme-primitive only when you need its config layer — i.e. as a theme block, or a section deliberately exposing those settings. A cart header writes `<h2 class="cart-title">Your cart</h2>`; it does **not** `{% render 'title' %}`.
- **Composite primitive** → no raw equivalent exists. **Always render** it — inlining would duplicate non-trivial logic (fractional stars, srcset ladders, price formatting). Extract one only at 2+ consumers; below that, inline the markup in its single consumer.

The test: *if I inline this, am I duplicating logic, or just writing an element?* Element → inline. Real reused logic → render.

## Decision flow

Walk the stack from the bottom up when designing a new pattern:

0. **Fixed content built from an existing element or primitive?** → No new layer. **Inline** the HTML element (element primitive, fixed content) or **render** the composite primitive. Only proceed downward if the merchant must configure it or it needs new structure.
1. **Stateless visual primitive a merchant should configure/add** (one element, one set of inputs, no repetition)? → **Layer 1.** Wrap a theme-primitive (existing or new) in a theme block.
2. **Composition of existing primitives, no new logic?** → **Layer 2.** Ship it as a preset in `sections/section.liquid`. Merchants can also rebuild the recipe by hand.
3. **Repeating shape (N items × structured fields per item) with content that stays curated per page?** → **Layer 3 (Framing A).** Specialized section with its own inline-block schema. Keep the data-rendering boundary clean — see "Duplication constraint" below.
4. **Content needs to ingest dynamic data** (metaobject lists, product collections, customer state)? → **Layer 4 (Framing B).** Specialized section that fetches data and loops via snippets. Often lives in the per-project repository, not the base theme.

If you're answering "yes" to multiple at once, you're probably looking at two layers — split the work.

## Layer 3 → 4 duplication constraint

Layer 3 sections must be *duplication-friendly*. A developer needing the Layer 4 variant should fork the Layer 3 file, rename it, and swap the data source with a localized change — not a refactor.

Concretely:

- **Schema and rendering stay separate.** The Liquid that iterates over `section.blocks` should be one contained chunk, not interleaved with business logic. A Framing B fork replaces this chunk with a metaobject loop.
- **Per-item rendering goes through a snippet.** Don't inline the per-item markup in the section body. The section orchestrates; a snippet renders. The same snippet serves the Framing A and Framing B variants.
- **No business logic in the inline-block flow.** Pricing, availability checks, filtering by collection, customer-state branching — none of these belong in a Layer 3 section. The moment they're needed, the section has graduated to Layer 4.

## Snippet vs theme block

The most common authoring mistake is conflating "this UI pattern is valuable" with "this should be a theme block." Many patterns earn a theme-primitive but not a block, because their natural use case requires the dynamic-data flows theme blocks can't express.

Patterns that ship (or will ship) as **theme-primitives only**, consumed by Layer 3 / 4 sections:

- `disclosure` — `<details>/<summary>` markup + rotation CSS. Used by a static FAQ section (Layer 3) and a collection-bound FAQ section (Layer 4).
- `hotspot` — positioned overlay marker. Used by a shoppable lookbook section that needs product GIDs per hotspot.
- `marquee` — infinite horizontal scroll container. Used by sections fed by logo metaobjects, product feeds, or curated lists.
- Table-style data display, carousel, grouped accordion — same shape.

These never become theme blocks because exposing them as merchant-composable primitives strands them at "static content only" — and the moment a merchant wants the dynamic version they're stuck.

## Existing layer mapping

| Layer | Shipped |
|---|---|
| 0 — Theme-primitive | `utility--*`, `image`, `icon`, `video`, `skip-to-content`, `validation--*`; render-side of every block (`title`, `button`, …) |
| 1 — Theme block | `title`, `richtext`, `button`, `media`, `group`, `columns`, `separator`, `spacer`, `embed` |
| 2 — `section.liquid` preset | `Section` (default empty composition) |
| 3 — Specialized section (Framing A) | *None shipped yet* |
| 4 — Specialized section (Framing B) | *None shipped yet — typically per-project* |

## Related

- `.context/rules/block-convention.md` — when to make a theme block (Layer 1); block-backed primitive markup contract
- `.context/rules/section-convention.md` — standard vs specialized sections (Layer 2 vs 3/4)
- `.context/rules/snippet-convention.md` — snippet structure (Layer 0)
- `.context/docs/css-standards.md` — component-rooted CSS; `.shopify-block--<name>` (block-backed) vs `.<name>` (sub-component) root classes
