# Validation contract

The per-tier shape of validation across the composition stack. The spec for an element is the functional source of truth; the validation suite proves the spec is honored. Each tier has its own concern and harness shape.

Companion doc: `validation.md` describes the mechanics — the three surfaces (generate-and-drop, per-snippet committed harness, permanent page showcase), the generate-and-drop lifecycle, the orchestrator, and the production-leak strategy. This contract describes what each tier *should* validate, regardless of present coverage.

## Tiers

Each tier maps onto one of the three validation surfaces (`validation.md` § Three surfaces).

| # | Tier | Validates | Surface · location |
|---|---|---|---|
| 1 | Substrate | Design-system tokens, utility snippets, utility CSS, utility JS — each in its own sub-shape | 1a: permanent page showcase (`sections/<type>.liquid` + `templates/page.<type>.json`). 1b/1c: generate-and-drop when they land. 1d: Vitest |
| 2 | Theme-primitive (L0 + L1) | The primitive's snippet API and, when block-backed, the block API. One matrix per primitive name | Generate-and-drop (`snippets/<name>.{validation.json,test.js}`); snippet-only primitives use a committed harness |
| 3 | Preset (L2) | Preset configuration robustness and cross-block cascade integration on `section.liquid` | Generate-and-drop (`sections/section--<preset>.{validation.json,test.js}`) |
| 4 | Specialized section (Beyond L2) | Section configuration robustness, inline-block / metaobject / dynamic-data states, empty- and partial-data fixtures | Generate-and-drop or committed harness (no coverage yet) |

Specialized sections ship as bespoke section files with explicitly-whitelisted blocks per `composition-strategy.md` § Beyond L2; the spec records the section file and the per-section blocks it whitelists.

**Preset vs section terminology.** Tier 3 validates *preset entries* of `section.liquid` — each preset gets its own colocated source + test even though they share `section.liquid` as host. Tier 4 validates *specialized section files*; the section is the validated unit regardless of whether it ships zero presets (pinned sections like header/footer), one preset (most specialized sections expose themselves to the editor this way), or multiple presets (variations of the same section appear as fixtures within the section's single validation source, not separate ones).

## Tier 1 — Substrate

Substrate is a category, not a unified tier. Each sub-shape has its own harness shape because what counts as "honoring the spec" differs across them.

### 1a — Metaobject (design tokens)

**Validates:** every entry of a metaobject type resolves to a usable design token at the consumption surface. Per-entry render check against the relevant CSS variable, contrast helper, or class.

**Harness:** a bare section that iterates `metaobjects.<type>.values` and renders one card per entry surfacing the handle and the consumed fields. Visual legibility is the eyeball check; computed-style assertion is the future Playwright bar.

**Surface:** permanent page showcase — `sections/<type>.liquid` + committed `templates/page.<type>.json`, merchant-browsable via a Page with the `page.<type>` template assigned in admin. Spec colocates at `sections/<type>.spec.md`.

### 1b — Utility snippet

**Validates:** input → output conformity. Given a documented input, the snippet emits the documented output.

**Harness:** renders the utility against a fixed input matrix and surfaces both the input and the rendered output side by side. Assertions are output-shape (DOM structure, attributes, text content).

**Surface:** generate-and-drop when a case matrix is block data, or a per-snippet committed harness when it is `{% render %}` arg logic. No utility-snippet validation exists today.

### 1c — Utility CSS

**Validates:** substrate-level CSS rules (focus ring, scheme cascade, forced-colors, reduced-motion, logical properties) reach their target surfaces with the expected computed style.

**Harness:** representative DOM that exercises the substrate rule. Assertions target computed style and applied custom properties.

**Surface:** generate-and-drop or a committed harness. No utility-css validation exists today.

### 1d — Utility JS

**Validates:** JS module functions and behaviors. Function-level conformity for pure helpers; behavioral conformity for `BaseComponent` managers and runtime modules.

**Harness:** today, none. Future state runs Vitest under `tests/unit/<module>.test.js`, importing modules directly. Until Vitest lands, spec-level prose assertions stand in.

## Tier 2 — Theme-primitive (L0 + L1)

**Validates:** the primitive's API surface. For element primitives, the render branches of the underlying tag emission. For composite primitives, the assembly's documented structure. When the primitive is block-backed, the block's schema settings × their render branches, in the same matrix.

**Page granularity:** one validation matrix per primitive *name*. It may contain two labelled groups when both consumer surfaces exist:

- *As a snippet* — the matrix of `{% render %}` calls a sub-component consumer would make.
- *As a block* — the matrix of `block.settings.*` configurations the editor would produce.

A primitive with only one surface (sub-component-only or block-only) renders one group.

**Harness:** for block-backed primitives, the generic harness (`sections/validation.liquid`) renders the colocated source's block matrix via `{% content_for 'blocks' %}`. For snippet-only primitives whose case matrix is `{% render %}` logic (`image`, `video`), the source names a committed harness section (`sections/validation--primitive--<name>.liquid`).

**Surface:** generate-and-drop — source + test at `snippets/<name>.{validation.json,test.js}`. The source's block matrix (or the committed harness's arg matrix) is the test spec.

**Boundary:** a primitive's validation tests only its own API. Metaobject-typed settings (`button_style`, `text_style`, `container_style`, …) are validated upstream at Tier 1a; the primitive exercises the *resolution chain* (setting → metaobject lookup → render) but not the metaobject's own legibility. The boundary also holds downstream: a block emits its contribution (attributes, modifiers, custom properties), but the section cascade that *applies* it (the rhythm rule painting a margin, the scheme repaint) only acts on direct theme-root children — so cascade-applied outcomes are asserted at Tier 3, and a primitive asserts the emitted custom property, not the applied result.

## Tier 3 — Preset (L2)

**Validates:** the preset's configuration robustness on `section.liquid`, and the cross-block cascade integration that emerges when its specific block composition is rendered. Catches cascade collisions — block-rhythm scope, focus-ring containment, scheme override at block level, separator collapse in flex parents.

**Harness:** the generic harness renders the colocated source's baked composition (a representative settings matrix) on the production theme-root grid. The source carries the preset's block tree plus the section-level CSS a composition needs — `color_scheme` and `content_width` as raw resolved values (see `validation.md` § Generic harness).

**Surface:** generate-and-drop — source + test at `sections/section--<preset>.{validation.json,test.js}`, sorting beside `section.liquid` / `section.spec.md`.

The four preset compositions (`hero`, `content`, `columns-features`, `cta-banner`) are *composition-integration fixtures*, not shipped L2 presets — authoring the shipped preset catalog (preset entries on `section.liquid` + per-preset specs) is separate product work. The compositions guard four primitive behaviors the isolated primitive matrices structurally can't reach: capped text-block self-centering in flex (`title` / `richtext` `justify-self`), a bare button filling the section grid (`button` `justify-self`), and a stack-below group collapsing to 0 in a shrink-wrap parent (`group` `inline-size: 100%`).

## Tier 4 — Specialized section (Beyond L2)

**Validates:** the same robustness + cascade concerns as Tier 3, plus the section's own settings × inline-block, metaobject, or dynamic-data input states. Empty data, partial data, and malformed-entry fixtures are required.

**Harness:** the source bakes the section's settings + inline blocks (for inline-authored content) or fixture references (for dynamic-data sources); the section renders against each fixture. Empty-state branches render the section's empty fallback.

**Surface:** generate-and-drop (or a committed harness where a Liquid arg matrix fits better). No specialized-section validation exists today.

Covers Beyond-L2 sections per `composition-strategy.md`: bespoke section files with explicitly-whitelisted blocks (no private theme blocks — the whitelist convention makes them unnecessary). Specialized sections (header / footer / cart / faq / collection-grid / featured-product) are out of scope until substrate confidence is established (subgrid migration ships + L1 block validation hardens).

## What the spec carries

Every spec includes a Validation section naming:

- the tier (and sub-shape if substrate)
- the surface and the colocated source (`<name>.validation.json`) or page template (`page.<name>.json`) the implementation ships
- the colocated test (`<name>.test.js`) once written, and the seeded handles its tests require
- the API surface to exercise (snippet args, block settings, section settings × fixtures)
- edge cases to render (blank inputs, malformed data, empty collections, scheme-switch, locale-switch)
- the visual showcase intent (what a reader sees)
- assertions — executable Playwright checks, each scoped to what the tier owns (emitted contribution, not cascade-applied result)
- unit scope, when the primitive carries JS (prose today; Vitest specs once installed)

The contract describes the tier; the spec describes the element's specific suite. A spec without a Validation section is incomplete.

## QoL vs validation

QoL deliverables (bare-tag showcase, preset library, metaobject browse pages) are spec-requested, not validation surfaces. They may share a surface with validation when intents coincide — a metaobject page showcase is both a validation surface and a token-browse surface. Splitting them is a spec decision, not a contract requirement.

The validation contract describes what *validation* covers. QoL deliverables ride along on whichever spec requests them, owned by the implementation pipeline.

## Test runner

Playwright (`@playwright/test`) drives colocated `<name>.test.js` specs, discovered by glob (`testMatch: **/*.test.js`). The orchestrator `.scripts/validation-e2e.mjs` (`npm run test:e2e`) stages each generate-and-drop element before its test and drops it after; tests run against a locally-running dev server (`npm run dev`), which `playwright.config.js` attaches to rather than spawning. e2e stays out of `npm run check` (the static gate needs no server). Vitest (`tests/unit/`) for the JS sub-shape is pending. No tier is gated on the test-runner work.

## Current state vs target state

| Tier | Sub-shape | Current coverage | Gap |
|---|---|---|---|
| 1a | Metaobject | 9 page showcases (`theme-color`, `button-style`, `container-style`, `content-width`, `gradient`, `icon`, `media-size`, `spacing`, `text-style`) | Computed-style assertion (eyeball only today) |
| 1b | Utility snippet | 0 | All utility-snippets uncovered |
| 1c | Utility CSS | 0 | Substrate rules uncovered |
| 1d | Utility JS | 0 | Awaits Vitest |
| 2 | Theme-primitive | 9 block primitives + 2 snippet-only (`image`, `video`) | No snippet-half group on block primitives; no L0 sub-component coverage beyond image/video |
| 3 | Preset | 4 generate-and-drop compositions with tests (`hero`, `content`, `columns-features`, `cta-banner`) | Shipped preset catalog is separate product work, not a validation gap |
| 4 | Specialized section | 0 | Awaits specialized-section work |

## Related

- `.context/docs/validation.md` — the three surfaces, generate-and-drop lifecycle, orchestrator, showcase access
- `.context/docs/composition-strategy.md` — the layer model the tiers map onto
- per-element specs (`**/*.spec.md`) — each carries a Validation section
