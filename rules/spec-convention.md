---
paths:
  - ".context/docs/specs/**/*.md"
---

# Spec convention

Every element in the theme — substrate token, utility, primitive snippet, primitive block, preset, specialized section — earns a spec at `.context/docs/specs/<kebab-name>.md` and an entry in `specs-index.md` under its composition layer.

A spec is the contract. It describes the element's API, output, behavior, validation, and out-of-scope. It is **not** a chronicle of how the design evolved — git history covers that. Write declaratively per `reference-voice.md`.

## File placement and indexing

- Path: `.context/docs/specs/<name>.md`. Name is kebab-case matching the element's filename (e.g. `theme-color`, `utility--color-contrast`, `star-rating`).
- Index entry: `specs-index.md` under the matching layer section (`Substrate`, `Layer 0 — Snippets`, `Layer 1 — Theme blocks`, `Layer 2 — Presets`, `Layer 3/4 — Sections`). One line, `(planned)` or `(shipped — retrofit)` status suffix.
- Template: copy `_template.md` and fill. Sections that don't apply get `N/A` with a one-clause reason, or omit entirely when the omission is obvious from the element's nature.

## Header fields

```
**Layer**: <0 | 1 | 2 | 3 | 4 | substrate>
**Type**: <snippet | block | preset on `section.liquid` | specialized section | metaobject | utility-css | utility-js> (`<filepath>` for shipped)
**Status**: <spec | shipped>
**Implementation**: <pin or `pending`>
**Reconciled**: <YYYY-MM-DD; omit when `Implementation: pending`>
**Depends on**: <files, primitives, metaobjects, utilities the element consumes>
**Consumers**: <where the element gets used>
**Whitelisted by** (L1 blocks only): <section + container block files whose schemas include this block type>
```

## Status states

| State | Meaning | Implementation field |
|---|---|---|
| `spec` | Designed, not yet built — or built but the spec was authored ahead of a retrofit | `pending` |
| `shipped` | Built and the spec describes current file behavior | Pinned to file:version pairs |

A spec that exists for an unshipped element is `spec`. A spec written as a retrofit of an already-shipped element is `shipped` from authoring time. There is no `drift` state — drift is detected by comparing the pin to the file's current version.

## Implementation pin format

A bulleted list of `` `path/to/file` vX.Y.Z (role) `` entries. The role parenthetical names the file's job inside the contract (e.g. `emitter`, `render surface`, `block schema`, `head tag emitter`).

```markdown
**Implementation**:
- `snippets/spacer.liquid` v1.1.2 (render surface)
- `blocks/spacer.liquid` v1.0.0 (block schema + theme-editor wrapper)
```

### Non-file implementations

Some implementations live outside the repo — Shopify-side metaobject definitions, settings_schema entries that depend on store state, GIDs bound to specific stores. Record them as free-text entries inside the same `Implementation` list, with the source-of-truth document named:

```markdown
- Metaobject definition itself — created per `metaobject-definitions.md` § `theme_color`
```

When `metaobject-definitions.md` has its own pinned reference (a commit hash or doc version), name it. Until that doc gets versioned, the cross-reference alone is the pin; the `Reconciled` date carries the freshness signal.

## Reconciliation discipline

The pin is the spec's anchor to the file state it was last verified against. The `Reconciled` date records when that verification happened.

A file change that touches contract-described surface — params, output shape, behavior branches, emitted CSS variables, locale keys, validation matrix — requires one of:

- **Spec amendment + pin bump + reconciled-date refresh** — when the change updates the contract.
- **Pin bump + reconciled-date refresh** — when the change is contract-neutral (refactor, internal var rename, output formatting tweak) and the spec is still accurate.
- **Explicit "spec unchanged; internal-only refactor" line in the commit message** — when neither side moves; used for changes that don't touch contract surface at all.

Drift signal: pin says vX, file is vY (Y > X), reconciled-date is stale. Reconciliation owed.

## Section ordering

Templates in `_template.md` lock the order. Don't reorder — readers learn to scan by position. Sections without content get a one-line `N/A — <reason>` or get omitted when nature obviously excludes them (e.g. metaobjects have no CSS section; CSS-only utilities have no Locale keys).

## Validation vs QoL

Per `validation-contract.md`, validation is the tier-specific harness proving the spec is honored. QoL is a separate developer-facing surface — a token browser, preset library, bare-tag showcase.

The two intents may share one file when they coincide naturally (a per-entry metaobject page is both validation and browse). The spec records both intents in separate sections regardless of file split — the implementation pass decides whether to merge or split.

## Cross-doc boundaries

Specs are the source of truth for an element's contract. When information overlaps with a global doc:

- **Metaobject seed entries + load-bearing handles + runtime behavior** live in the spec, not in `metaobject-definitions.md` (that doc carries only the type/field schema for setup).
- **Consumer patterns + Liquid usage** live in `design-system-metaobjects.md` (catalog-wide patterns) only when they generalize across types; per-type specifics live in the spec.
- **Locale keys** introduced for an element are listed in its spec; locale-file structure lives in `locale-conventions.md`.

When a spec absorbs material from a global doc, the global doc cross-references back to the spec. No content lives in two places.

## Voice

Reference voice (`reference-voice.md`): state what is, not how it was decided. Avoid motivational framing, journey residue, rhetorical questions as rules, defensive rebuttals, editorializing, conversational asides.

Use one-clause rationale (`X, so Y`) only when the *why* guides future application — e.g. "Semantic seeds (`success`/`warning`/`error`/`info`) are load-bearing because component CSS references them by name; renaming silently breaks rules."

## Related

- `_template.md` — copy as starting point
- `validation-contract.md` — per-tier validation harness shapes
- `composition-strategy.md` — layer model the `Layer` header field maps onto
- `reference-voice.md` — phrasing rules for all reference docs
