---
name: triage
description: Translate a business need (Linear ticket, design brief, gap report) into a layered work plan — which specs to author, which files to touch, which validations to add. Walks the layer model in composition-strategy.md, enumerates affected primitives + their spec status (shipped / planned / new), surfaces open design questions that block authoring. Invoke when a new unit of work begins and scope decisions must precede authoring. Pipeline phase 1 of 6 (triage → spec-author → spec-review → implementation → validation → audit).
status: draft (refine after first use)
---

# Triage

Translate a business need into a layered work plan. The output is a punch list naming the specs to author, the implementations to write, the validations to add, and the open design questions to resolve before authoring begins.

## Trigger

A business need lands — Linear ticket, merchant request, design brief, or a developer noticing a gap — and a scope decision must happen before any spec or code is authored.

## Inputs

- The business need stated in 1–3 sentences (what the merchant wants to do / see)
- Awareness of the current spec inventory (`.context/specs/specs-index.md`)
- The layer model in `.context/docs/composition-strategy.md`

## Checklist

1. **Restate the business need** in your own words to confirm understanding. Keep it merchant-facing — what does the storefront visitor or admin do?
2. **Identify the surface** that delivers the need — a new section, a preset on `section.liquid`, a specialized section, an addition to an existing block, etc.
3. **Walk the layer model** (`composition-strategy.md`) to assign the surface to a layer (substrate / L0 / L1 / L2 / Beyond-L2). Many archetypes are L2 presets, not new sections.
4. **Enumerate the primitives** the surface composes. For each: is it shipped (`Status: shipped` in spec), planned (`Status: spec`), or net-new (no spec yet)?
5. **Identify substrate / metaobject dependencies**:
   - Does the work require new metaobject entries seeded?
   - New scheme-role tokens? New design constants?
   - New utility snippets or JS modules?
6. **Identify implementation work beyond specs**: validation page(s), new locale keys, theme settings, template files.
7. **Surface open design questions** — anything that can't be resolved by reading existing docs/specs. These need user input before spec authoring begins. Examples: settings shape, default values, presets included in v1, scope of v1 vs deferred.
8. **Order the work** by dependency: which spec must be authored first because others depend on it?

## Outputs

A punch list with:

- Restated business need
- Layer-by-layer breakdown of work (substrate touches / L0 / L1 / L2 / specialized)
- For each spec: name + layer + status (existing / revise / new)
- For each implementation: file path + nature (new / update)
- Validation surfaces to add
- Open design questions ranked by blocking severity
- Suggested authoring order

## Done state

The punch list is documented (chat surface, or a working note) and any blocking design questions have been resolved with the developer before proceeding to spec authoring.

## Handoff

Each spec on the list becomes an entry point to the **spec-author** phase. The phase repeats per spec until the punch list is empty.
