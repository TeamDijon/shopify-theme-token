---
paths:
  - "**/*.spec.md"
---

# Spec convention

Every element in the theme — substrate token, utility, primitive snippet, primitive block, preset, specialized section — earns a spec colocated beside its code (the logic owner), on `main`, discovered by glob.

A spec is the contract. It describes the element's API, output, behavior, validation, and out-of-scope. It is **not** a chronicle of how the design evolved — git history covers that. Write declaratively per `reference-voice.md`.

## File placement

- **Colocated beside the logic owner**, on `main`, named `<name>.spec.md` in kebab-case matching the element (e.g. `theme-color`, `utility--color-contrast`, `star-rating`). Discovered by glob (`**/*.spec.md`) — there is no maintained index.
- Where the logic owner lives, by type:
  - snippet, or block+snippet pair → `snippets/<name>.spec.md` (the snippet owns the logic; a pair pins both `snippets/<name>.liquid` + `blocks/<name>.liquid`).
  - block-only → `blocks/<name>.spec.md`; section host → `sections/section.spec.md`; layout → `layout/<name>.spec.md`.
  - utility JS / CSS → `assets/<name>.spec.md`.
  - metaobject → `sections/<name>.spec.md`, beside its permanent bare `sections/<name>.liquid` + `templates/page.<name>.json` showcase (the metaobject's merchant-browsable visible artifact).
- Template: copy `_template.md` and fill. Sections that don't apply get `N/A` with a one-clause reason, or omit entirely when the omission is obvious from the element's nature.

## Header fields

```
**Layer**: <0 | 1 | 2 | 3 | 4 | substrate>

**Type**: <snippet | block | preset on `section.liquid` | specialized section | metaobject | utility-css | utility-js> (`<filepath>` for shipped)

**Status**: <spec | shipped>

**Implementation**: <pin or `pending`>

**Reconciled**: <YYYY-MM-DD; omit when `Implementation: pending`>

**Reviewed**: <YYYY-MM-DD or `pending` when never reviewed>

**Depends on**: <files, primitives, metaobjects, utilities the element consumes>

**Consumers**: <where the element gets used>

**Whitelisted by** (L1 blocks only): <section + container block files whose schemas include this block type>
```

Each header field is its own paragraph — a blank line separates every field. Without the blank lines, CommonMark renderers attach the bulleted Implementation/Consumers sub-lists to adjacent fields visually, breaking the header block's flow. The blank-line rule applies regardless of whether the field is inline or bulleted.

## Status states

| State | Meaning | Implementation field |
|---|---|---|
| `spec` | Designed, not yet built — or built but the spec was authored ahead of a retrofit | `pending` |
| `shipped` | Built and the spec describes current file behavior | Pinned to file:version pairs |

A spec that exists for an unshipped element is `spec`. A spec written as a retrofit of an already-shipped element is `shipped` from authoring time. There is no `drift` state — drift is detected by comparing the pin to the file's current version.

## Implementation pin format

Each entry is `` `path/to/file` vX.Y.Z (role) ``. The role parenthetical names the file's job inside the contract (e.g. `emitter`, `render surface`, `block schema`, `head tag emitter`).

Inline when single-entry; bulleted list when 2+. Same rule applies to the `Consumers` field — keeps the header block reading as uniform `**Key**: value` pairs in the common single-entry case.

```markdown
**Implementation**: `snippets/utility--color-contrast.liquid` v1.0.0 (render surface)
```

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

### Substrate stylesheets — same pattern

Substrate CSS files (`assets/layer-theme.css`, `assets/layer-base.css`, etc.) aggregate many concerns — body appearance defaults, the bleed grid, the rhythm cascade, container-style variants. Versioning the file as a whole would force every spec pinning it to reconcile on every substrate edit, regardless of whether the edit touches the spec's surface. Specs pin substrate CSS the same way they pin metaobject definitions: by description naming the scope (`@layer` block, selector, rule role) the spec depends on. The structural anchor is the selector or layer name; the `Reconciled` date is the freshness signal.

```markdown
- `assets/layer-theme.css` `@layer theme` — variant CSS rules scoped across `:where(.shopify-block--group, .shopify-block--columns, .shopify-block--media)[data-modifiers*='container-style:<handle>']`
```

Drift detection is manual at reconciliation: re-read the named scope, confirm the rule body still matches what the spec describes. If the selector chain or the structural pattern changed, spec body amends; if rule values changed but the contract surface didn't, refresh the `Reconciled` date only.

## Reconciliation discipline

The pin is the spec's anchor to the file state it was last verified against. The `Reconciled` date records when that verification happened.

A file change that touches contract-described surface — params, output shape, behavior branches, emitted CSS variables, locale keys, validation matrix — requires one of:

- **Spec amendment + pin bump + reconciled-date refresh** — when the change updates the contract.
- **Pin bump + reconciled-date refresh** — when the change is contract-neutral (refactor, internal var rename, output formatting tweak) and the spec is still accurate.
- **Explicit "spec unchanged; internal-only refactor" line in the commit message** — when neither side moves; used for changes that don't touch contract surface at all.

Drift signal: pin says vX, file is vY (Y > X), reconciled-date is stale. Reconciliation owed.

## Review discipline

`Reviewed` is a separate signal from `Reconciled`. It records when a developer (with or without an agent) read the spec end-to-end and signed off on its content — the prose still reads correctly, design assumptions hold, cross-references resolve, the spec accurately describes the intended contract.

The two dates answer different questions:

| Field | Question | Asserted by |
|---|---|---|
| `Reconciled` | Does the pin match the file's current version? | Automated audit possible (parse pin, compare to file version header) |
| `Reviewed` | Has a human vetted the spec's prose and design rationale? | Only the human signing off |

A spec can be reconciled-fresh and review-stale (pin matches the file but no one has re-read the prose since a substantial revision). Inverse is also valid (recently reviewed but file has moved since — reconcile owed).

Bump `Reviewed` on any review pass, even if no content changes — the value is the sign-off, not the diff. When a review surfaces content changes, they land in the same commit; the Reviewed date covers them.

Every spec carries the `Reviewed` field as a `pending` placeholder until its first review pass — a glanceable signal of which specs still owe a developer read-through. On first review, replace `pending` with the date; on subsequent reviews, bump the date.

## Section ordering

Templates in `_template.md` lock the order. Don't reorder — readers learn to scan by position. Sections without content get a one-line `N/A — <reason>` or get omitted when nature obviously excludes them (e.g. metaobjects have no CSS section; CSS-only utilities have no Locale keys).

### Type-specific variants

A few section names + omissions vary by spec type:

| Spec type | Section variants |
|---|---|
| **Metaobject** (`Type: metaobject`) | Replace `## API` with `## Schema (definition contract)` — metaobjects have a field definition, not a call interface. Add `## Seed entries` after Schema listing the recommended catalog. `## CSS` is typically N/A (metaobjects contribute data; the consuming snippet emits CSS). `## CSS custom properties (exposed)` is present for metaobjects that emit named CSS variables via `utility--css-variables` (e.g. `theme_color`, `gradient`, `spacing`, `text_style`); N/A for catalogs without variable emission (e.g. `icon`, `button_style`). `## A11y` and `## Locale keys` are typically N/A. |
| **utility-js** (`Type: utility-js`) | `## CSS`, `## CSS custom properties (exposed)`, `## A11y`, `## Locale keys` all typically N/A. JS modules contribute behavior, not rendered DOM. |
| **utility-css** (`Type: utility-css`) | `## A11y` typically N/A unless the utility-CSS specifically encodes accessibility patterns (focus rings, reduced-motion). `## Locale keys` N/A. |
| **L0 snippet / L1 block / section** | All template sections apply. A11y as a standalone section earns its keep when the element has substantial accessibility surface (semantic element choice + ARIA + keyboard / focus). Mark the standalone section N/A or fold a couple of bullets into Behavior when the surface is light. |

`## Related` is universal — every spec carries it as the final section per the CLAUDE.md guideline: list only references the body doesn't already make.

### CSS custom property header

The canonical header is `## CSS custom properties (exposed)`. Variants like `(emitted)` are drift; the template uses `(exposed)` and consumers should match. The column order in the per-property table is `| Variable | Type | Source |` (substrate variable catalogs) or `| Variable | Purpose | Default |` (component-CSS specs documenting their consumer-overridable surface).

### Spec filename convention

Spec filenames use kebab-case (`text-style.spec.md`, `content-width.spec.md`, `button-style.spec.md`) uniformly across the corpus. For metaobject-type specs, this means the filename diverges from the underlying Shopify type key (which uses snake_case: `text_style` / `content_width` / `button_style`). The type key appears in the Schema field tables and Implementation pin where it's load-bearing; the spec name follows kebab-case for filesystem consistency with non-metaobject specs.

## Validation vs QoL

Per `validation-contract.md`, validation is the tier-specific harness proving the spec is honored. QoL is a separate developer-facing surface — a token browser, preset library, bare-tag showcase.

The two intents may share one file when they coincide naturally (a per-entry metaobject page is both validation and browse). The spec records both intents in separate sections regardless of file split — the implementation pass decides whether to merge or split.

## Cross-doc boundaries

Specs are the source of truth for an element's contract. When information overlaps with a global doc:

- **Metaobject seed entries + load-bearing handles + runtime behavior** live in the spec, not in `metaobject-definitions.md` (that doc carries only the type/field schema for setup).
- **Consumer patterns + Liquid usage** live in `design-system-metaobjects.md` (catalog-wide patterns) only when they generalize across types; per-type specifics live in the spec.
- **Locale keys** introduced for an element are listed in its spec; locale-file structure lives in `locale-conventions.md`.
- **API surface of an element documented by a pattern doc** (e.g. `modifier-system.md` documenting the `data-modifiers` attribute, which `modifiers-manager.js` implements) lives in the element's spec, not the pattern doc. Pattern docs describe *when* and *why* — when to reach for the pattern, naming rules, CSS hooks, prefix collisions. Specs describe *the API*. Restating API in a pattern doc creates drift without a pin to catch it; cross-reference the spec instead.

When a spec absorbs material from a global doc, the global doc cross-references back to the spec. No content lives in two places.

## Voice

Reference voice (`reference-voice.md`): state what is, not how it was decided. Avoid motivational framing, journey residue, rhetorical questions as rules, defensive rebuttals, editorializing, conversational asides.

Use one-clause rationale (`X, so Y`) only when the *why* guides future application — e.g. "Semantic seeds (`success`/`warning`/`error`/`info`) are load-bearing because component CSS references them by name; renaming silently breaks rules."

## Related

- `_template.md` — copy as starting point
- `validation-contract.md` — per-tier validation harness shapes
- `composition-strategy.md` — layer model the `Layer` header field maps onto
- `reference-voice.md` — phrasing rules for all reference docs
