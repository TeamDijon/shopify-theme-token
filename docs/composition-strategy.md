# Composition strategy

Token assigns every new UI need to one of five layers. This is the decision flow to run *before* writing code for a new pattern — it prevents the common failure mode of building a theme block for something that's actually a snippet, or a specialized section for something that's already expressible as a composition of primitives.

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

Layer 1 — Theme block + matching snippet
  Atomic, stateless visual primitive. Composable wherever a section
  accepts @theme children. Instance-specific config via schema.
  Examples: title, richtext, button, media, group, columns, separator,
  spacer, embed.

Layer 0 — Snippet
  Pure rendering logic, no schema. Reusable from any consumer (block,
  section, layout, other snippet).
  Examples: utility--*, button, image, icon, video, skip-to-content.
```

## Decision flow

Walk the layers from the bottom up when designing a new pattern:

1. **Stateless visual primitive** (one element, one set of inputs, no repetition)? → **Layer 1.** Wrap an existing snippet (or write one) in a theme block.
2. **Composition of existing primitives, no new logic?** → **Layer 2.** Ship it as a preset in `sections/section.liquid`. Merchants can also rebuild the recipe by hand.
3. **Repeating shape (N items × structured fields per item) with content that stays curated per page?** → **Layer 3 (Framing A).** Specialized section with its own inline-block schema. Build it so the data-rendering boundary stays clean — see "Duplication constraint" below.
4. **Content needs to ingest dynamic data** (metaobject lists, product collections, customer state)? → **Layer 4 (Framing B).** Specialized section that fetches data and loops via snippets. Often lives in the per-project repository, not the base theme.

If you're answering "yes" to multiple at once, you're probably looking at two layers — split the work.

## Layer 3 → 4 duplication constraint

Layer 3 sections must be *duplication-friendly*. A developer needing the Layer 4 variant should fork the Layer 3 file, rename it, and swap the data source with a localized change — not a refactor.

Concretely:

- **Schema and rendering stay separate.** The Liquid that iterates over `section.blocks` should be one contained chunk, not interleaved with business logic. A Framing B fork replaces this chunk with a metaobject loop.
- **Per-item rendering goes through a snippet.** Don't inline the per-item markup in the section body. The section orchestrates; a snippet renders. The same snippet serves the Framing A and Framing B variants.
- **No business logic in the inline-block flow.** Pricing, availability checks, filtering by collection, customer-state branching — none of these belong in a Layer 3 section. The moment they're needed, the section has graduated to Layer 4.

## Snippet vs theme block

The most common authoring mistake is conflating "this UI pattern is valuable" with "this should be a theme block." Many patterns earn a snippet but not a block, because their natural use case requires the dynamic-data flows theme blocks can't express.

Patterns that ship (or will ship) as **snippets only**, consumed by Layer 3 / 4 sections:

- `disclosure` — `<details>/<summary>` markup + rotation CSS. Used by a static FAQ section (Layer 3) and a collection-bound FAQ section (Layer 4).
- `hotspot` — positioned overlay marker. Used by a shoppable lookbook section that needs product GIDs per hotspot.
- `marquee` — infinite horizontal scroll container. Used by sections fed by logo metaobjects, product feeds, or curated lists.
- Table-style data display, carousel, grouped accordion — same shape.

These never become theme blocks because exposing them as merchant-composable primitives strands them at "static content only" — and the moment a merchant wants the dynamic version they're stuck.

## Existing layer mapping

| Layer | Shipped |
|---|---|
| 0 — Snippet | `utility--*`, `button`, `image`, `icon`, `video`, `skip-to-content`, `validation--*` |
| 1 — Theme block | `title`, `richtext`, `button`, `media`, `group`, `columns`, `separator`, `spacer`, `embed` |
| 2 — `section.liquid` preset | `Section` (default empty composition) |
| 3 — Specialized section (Framing A) | *None shipped yet* |
| 4 — Specialized section (Framing B) | *None shipped yet — typically per-project* |

## Related

- `.context/rules/block-convention.md` — when to make a theme block (Layer 1)
- `.context/rules/section-convention.md` — standard vs specialized sections (Layer 2 vs 3/4)
- `.context/rules/snippet-convention.md` — snippet structure (Layer 0)
