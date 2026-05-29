# <element-name>

**Layer**: <0 | 1 | 2 | 3 | 4>
**Type**: <snippet | block | preset on `section.liquid` | specialized section> (`<filepath>`)
**Status**: <spec | shipped>
**Depends on**: <files, primitives, metaobjects, utilities this element consumes>
**Consumers**: <where this element gets used>

## Purpose

One paragraph: what this element is, when to reach for it, what distinguishes it from sibling primitives at the same layer. The spec describes the element's contract at the layer triage has assigned — layer placement and rationale live upstream.

## API

| Arg / Setting | Type | Required | Notes |
|---|---|---|---|
|  |  |  |  |

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
- A11y notes (semantic element choice, keyboard, focus, SR-only text)
- Edge-case handling (blank inputs, malformed data, missing dependencies)

## Locale keys

For new elements, list keys to add: `namespace.key` — `"value"` (purpose; locale keys live in `en.default.json` + `fr.json` per `locale-conventions.md`). For retrofits, list the keys the element already uses as the contract.

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

## Out of scope

- Explicit non-goals — patterns or features this element does NOT cover, so the next reader doesn't ask "should it do X?"
