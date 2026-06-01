# <element-name>

**Layer**: <0 | 1 | 2 | 3 | 4 | substrate>
**Type**: <snippet | block | preset on `section.liquid` | specialized section | metaobject | utility-css | utility-js> (`<filepath>`)
**Status**: <spec | shipped>
**Implementation**: <file:version pairs implementing this contract, or `pending` when `Status: spec`. Format: bulleted list of `` `path/to/file` vX.Y.Z (role) ``. The pin is the spec's anchor to the file state it was last reconciled against; on file version bumps, either bump this pin (spec still accurate) or amend the spec (then bump). Commit-time discipline: a file change touching contract-described surface requires either a spec amendment + pin bump OR an explicit no-op note in the commit message.>
**Reconciled**: <YYYY-MM-DD — date the spec was last verified against the pinned implementation file(s). Omit the line when `Implementation: pending`.>
**Reviewed**: <YYYY-MM-DD or `pending` when never reviewed — date a developer last reviewed the spec end-to-end and signed off on its content. Separate signal from Reconciled (pin↔file drift): Reviewed asserts editorial sign-off, not mechanical version match. Every spec carries this field; replace `pending` with the date on first review. See `spec-convention.md` § Review discipline.>
**Depends on**: <files, primitives, metaobjects, utilities this element consumes>
**Consumers**: <where this element gets used>
**Whitelisted by** (L1 blocks only): <sections and container blocks whose schemas include this block type, e.g. `section.liquid`, `group`, `columns`. The implementation step updates each of these schemas; this line is the checklist.>

## Purpose

One paragraph: what this element is, when to reach for it, what distinguishes it from sibling primitives at the same layer. The spec describes the element's contract at the layer triage has assigned — layer placement and rationale live upstream.

## API (or Schema for metaobject-type specs)

For most element types — snippets, blocks, sections, JS utilities — name this section `## API` and list the call interface:

| Arg / Setting | Type | Required | Notes |
|---|---|---|---|
|  |  |  |  |

For metaobject-type specs, replace `## API` with `## Schema (definition contract)` — metaobjects have a field definition, not a call interface. List fields with their type / required / validation / notes. See `spec-convention.md` § Section ordering for the variant.

For block-backed primitives, list both the snippet args (`{% render %}` interface) and the block schema settings (`block.settings.*` interface). Two tables or one combined table — whichever stays readable. For sections, list section settings + inline-block fields.

## Output shape

```html
<element class="...">
  ...
</element>
```

## CSS

Component-rooted per `css-standards.md`. Sketch the structural rules; full implementation lives in the file.

```css
.element {
  /* ... */
}
```

## CSS custom properties (exposed)

| Variable | Purpose | Default |
|---|---|---|
|  |  |  |

## Behavior

- Branch behavior per API combination
- Early-exit conditions
- Edge-case handling (blank inputs, malformed data, missing dependencies)

For primitives with substantial accessibility surface (semantic element choice + ARIA wiring + keyboard / focus / SR-only text), split A11y into its own section below. For elements with simple or no a11y concerns, fold a few bullets into Behavior or mark the standalone A11y section as N/A.

## A11y

Optional first-class section for primitives with substantial accessibility contracts (semantic element choice, ARIA roles + attributes, keyboard interactions, focus management, SR-only text). Omit or mark `N/A` for elements without merchant-facing rendered output — metaobject / utility-css / utility-js specs typically have N/A here. JS utilities that observe / manipulate state without rendering have no a11y surface.

## Locale keys

For new elements, list keys to add: `namespace.key` — `"value"` (purpose; locale keys live in `en.default.json` + `fr.json` per `locale-conventions.md`). For retrofits, list the keys the element already uses as the contract. Mark `N/A — <reason>` for elements without user-facing strings (pure-logic JS utilities, design-system catalogs, metaobject specs).

## Validation

Per `validation-contract.md`:

- **Tier**: substrate (sub-shape) | primitive | preset | section
- **Page(s)**: `validation--<...>` — list the section files the implementation will ship
- **API surface**: the matrix to exercise; for primitives split into *as a snippet* and *as a block* groups when both consumer surfaces exist
- **Edge cases**: blank inputs, malformed data, empty collections, scheme-switch, locale-switch — name the ones this element needs to cover
- **Visual showcase**: what a reader sees on the page (the page's intent for the human eyeball pass)
- **Assertions**: prose now — what a passing render looks like. Selectors + expectations once Playwright lands.
- **Unit scope** (JS-bearing only): function-level cases for any JS module the element ships. Vitest specs once installed.

## Implementation-time decisions

Open questions deferred to the build pass — small choices that don't gate spec sign-off but need a call before the file ships. Omit the section when none apply (typical for retrofit specs of shipped elements).

## Seed entries (metaobject-type specs only)

For metaobject-type specs, list the recommended seeded catalog (handle / name / field values) per `metaobject-definitions.md` § <type>. The seed table is what the implementation step writes into a fresh store; load-bearing handles (those the runtime / CSS treats as canonical) are flagged here. Omit this section entirely for non-metaobject specs.

## Out of scope

- Explicit non-goals — patterns or features this element does NOT cover, so the next reader doesn't ask "should it do X?"

## Related

- One bulleted list of cross-references to sibling specs, docs, rules, conventions the reader benefits from. List only what the body doesn't already make obvious. Drop the section when everything's already inline (rare in practice).
