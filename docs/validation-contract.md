# Validation contract

The per-tier shape of validation across the composition stack. The spec for an element is the functional source of truth; the validation suite proves the spec is honored. Each tier has its own concern and harness shape.

Companion doc: `validation.md` describes the current implementation state (the 21 shipped pages, the hub, the production-leak strategy, the helper snippets). This contract describes what each tier *should* validate, regardless of present coverage.

## Tiers

| # | Tier | Validates | File prefix |
|---|---|---|---|
| 1 | Substrate | Design-system tokens, utility snippets, utility CSS, utility JS — each in its own sub-shape | `validation--substrate--*`, `validation--utility-snippet--*`, `validation--utility-css--*`, `validation--utility-js--*` |
| 2 | Theme-primitive (L0 + L1) | The primitive's snippet API and, when block-backed, the block API. One page per primitive name | `validation--primitive--*` |
| 3 | Preset (L2) | Preset configuration robustness and cross-block cascade integration on `section.liquid` | `validation--preset--*` |
| 4 | Specialized section (L3 + L4) | Section configuration robustness, inline-block / metaobject data states, empty- and partial-data fixtures | `validation--section--*` |

The `validation` filename pattern stays per `validation.md`. Layer 3 and Layer 4 share Tier 4; the spec records which framing applies.

**Preset vs section terminology.** Tier 3 validates *preset entries* of `section.liquid` — each preset gets its own page even though they share `section.liquid` as host. Tier 4 validates *specialized section files*; the section is the validated unit regardless of whether it ships zero presets (pinned sections like header/footer), one preset (most L4 sections expose themselves to the editor this way), or multiple presets (variations of the same section appear as fixtures within the section's single validation page, not separate pages).

## Tier 1 — Substrate

Substrate is a category, not a unified tier. Each sub-shape has its own harness shape because what counts as "honoring the spec" differs across them.

### 1a — Metaobject (design tokens)

**Validates:** every entry of a metaobject type resolves to a usable design token at the consumption surface. Per-entry render check against the relevant CSS variable, contrast helper, or class.

**Harness:** a section that iterates `metaobjects.<type>.values` and renders one card per entry surfacing the handle and the consumed fields. Visual legibility is the eyeball check; computed-style assertion is the future Playwright bar.

**Files:** `sections/validation--substrate--<type>.liquid` + `templates/index.validation--substrate--<type>.json`.

May share its surface with a QoL template requested by the metaobject's spec (the two intents coincide naturally; the contract does not require splitting them).

### 1b — Utility snippet

**Validates:** input → output conformity. Given a documented input, the snippet emits the documented output.

**Harness:** a section that renders the utility against a fixed input matrix and surfaces both the input and the rendered output side by side. Assertions are output-shape (DOM structure, attributes, text content).

**Files:** `sections/validation--utility-snippet--<name>.liquid` + `templates/index.validation--utility-snippet--<name>.json`.

No utility-snippet validation pages exist today.

### 1c — Utility CSS

**Validates:** substrate-level CSS rules (focus ring, scheme cascade, forced-colors, reduced-motion, logical properties) reach their target surfaces with the expected computed style.

**Harness:** a section presenting representative DOM that exercises the substrate rule. Assertions target computed style and applied custom properties.

**Files:** `sections/validation--utility-css--<concern>.liquid` + `templates/index.validation--utility-css--<concern>.json`.

No utility-css validation pages exist today.

### 1d — Utility JS

**Validates:** JS module functions and behaviors. Function-level conformity for pure helpers; behavioral conformity for `BaseComponent` managers and runtime modules.

**Harness:** today, none. Future state runs Vitest under `tests/unit/<module>.test.js`, importing modules directly. Until Vitest lands, this sub-shape is documented for completeness; spec-level prose assertions stand in.

## Tier 2 — Theme-primitive (L0 + L1)

**Validates:** the primitive's API surface. For element primitives, the render branches of the underlying tag emission. For composite primitives, the assembly's documented structure. When the primitive is block-backed, the block's schema settings × their render branches, in the same page.

**Page granularity:** one validation page per primitive *name*. A page may contain two labelled groups when both consumer surfaces exist:

- *As a snippet* — the matrix of `{% render %}` calls a sub-component consumer would make.
- *As a block* — the matrix of `block.settings.*` configurations the editor would produce.

A primitive with only one surface (sub-component-only or block-only) renders one group.

**Harness:** a section that accepts `@theme` blocks and renders them via `{% content_for 'blocks' %}` for the block half, plus inline `{% render %}` calls for the snippet half. The JSON template at `templates/index.validation--primitive--<name>.json` bakes the block-half matrix; the section bakes the snippet-half matrix inline.

**Files:** `sections/validation--primitive--<name>.liquid` + `templates/index.validation--primitive--<name>.json`.

**Boundary:** a primitive's validation page tests only its own API. Metaobject-typed settings (`button_style`, `text_style`, `container_style`, …) are validated upstream at Tier 1a; the primitive page exercises the *resolution chain* (setting → metaobject lookup → render) but not the metaobject's own legibility.

## Tier 3 — Preset (L2)

**Validates:** the preset's configuration robustness on `section.liquid`, and the cross-block cascade integration that emerges when its specific block composition is rendered. Catches cascade collisions — block_rhythm scope, focus-ring containment, scheme override at block level, separator collapse in flex parents.

**Harness:** the JSON template bakes the preset's block composition with a representative settings matrix; the section renders the preset's expected configuration variants side by side or sequentially with labels.

**Files:** `sections/validation--preset--<name>.liquid` + `templates/index.validation--preset--<name>.json`.

The 4 current "composition" pages (`hero`, `content`, `columns-features`, `cta-banner`) are proto-presets; they slot here at retrofit time.

## Tier 4 — Specialized section (L3 + L4)

**Validates:** the same robustness + cascade concerns as Tier 3, plus the section's own settings × inline-block (Framing A) or dynamic-data (Framing B) input states. Empty data, partial data, and malformed-entry fixtures are required.

**Harness:** the JSON template bakes the section's settings + inline blocks (Framing A) or fixture references (Framing B); the section renders against each fixture. Empty-state branches render the section's empty fallback.

**Files:** `sections/validation--section--<name>.liquid` + `templates/index.validation--section--<name>.json`.

No specialized-section validation pages exist today.

## What the spec carries

Every spec under `.context/docs/specs/` includes a Validation section naming:

- the tier (and sub-shape if substrate)
- the validation page(s) the implementation will ship
- the API surface to exercise (snippet args, block settings, section settings × fixtures)
- edge cases to render (blank inputs, malformed data, empty collections, scheme-switch, locale-switch)
- the visual showcase intent (what a reader sees on the page)
- assertions (prose today; selectors + expectations once Playwright lands)
- unit scope, when the primitive carries JS (prose today; Vitest specs once installed)

The contract describes the tier; the spec describes the element's specific suite. A spec without a Validation section is incomplete.

## QoL vs validation

QoL templates (bare-tag showcase, preset library, metaobject browse pages) are spec-requested deliverables, not validation pages. They may share a surface with a validation page when intents coincide (a metaobject-tier page is both a validation surface and a token-browse surface). Splitting them is a spec decision, not a contract requirement.

The validation contract describes what *validation* covers. QoL deliverables ride along on whichever spec requests them, owned by the implementation pipeline, not the validation pipeline.

## Forward-compat notes

Spec-level assertions are prose today. When Vitest lands under `tests/unit/` and Playwright under `tests/e2e/`, prose assertions become executable specs targeting the same Liquid surfaces. The contract does not change; only its consumers do. No tier is gated on the test-runner work.

## Current state vs target state

Honest accounting:

| Tier | Sub-shape | Current pages | Gap |
|---|---|---|---|
| 1a | Metaobject | 8 (theme-color, icon, text-style, button-style, container-style, media-size, content-width, spacing) | `typeface` page missing |
| 1b | Utility snippet | 0 | All utility-snippets uncovered |
| 1c | Utility CSS | 0 | Substrate rules uncovered |
| 1d | Utility JS | 0 | Awaits Vitest |
| 2 | Theme-primitive | 9 (existing `--block--` pages cover L1 only; no snippet-half group, no L0 sub-component coverage) | Add snippet-half groups; ship pages for the 9 written L0 specs |
| 3 | Preset | 4 (current `--section--` pages are proto-presets) | Rename at retrofit; no other gaps |
| 4 | Specialized section | 0 | Awaits Batch 4/5 |

Retrofit of the 9 existing `--block--` pages and the 4 existing `--section--` pages is deferred per `BACKLOG.md`'s strategic direction. New specs authored from Batch 2 onward apply the contract directly.

## Related

- `.context/docs/validation.md` — current implementation state, hub, production-leak strategy, helper snippets
- `.context/docs/composition-strategy.md` — the layer model the tiers map onto
- `.context/docs/specs/` — per-element specs, each carries a Validation section
