# Knowledge architecture

How the `.context/` knowledge layer is organized + where to start depending on what you're doing. Maps the four document categories — **rules**, **docs**, **specs**, **skills** — and the cross-references between them.

For the codebase itself (repo layout, render model, asset pipeline, CSS layers, conventions), see `architecture.md`. This doc is the knowledge-layer counterpart.

## The four categories

| Category | Path | Audience | Role |
|---|---|---|---|
| **Specs** | `.context/specs/<name>.md` | Authors + agents | Per-element contract — one spec per element (snippet, block, section, metaobject, utility-js, utility-css). The spec is the **source of truth** for the element's API, output, behavior, and validation. |
| **Docs** | `.context/docs/<topic>.md` | Authors + agents | Cross-cutting patterns referenced by multiple specs or rules. Architecture, composition model, asset loading, naming conventions, validation contract. A pattern earns a doc when **2+ rules or specs reference it**. |
| **Rules** | `.context/rules/<convention>.md` | Authors (per-file glob-loaded) | Authoring conventions for one file type — how to write a snippet, a block, a section, a JS asset, a spec. Loaded into agent context when editing a matching file (per the rule's glob). |
| **Skills** | `.claude/skills/<phase>/SKILL.md` | Pipeline runbooks | Phase-specific workflow — triage, spec-author, spec-review, implementation, validation, audit. Invoked explicitly when entering a phase. |

## Where to start

| If you're … | Start here |
|---|---|
| Orienting to the codebase | `architecture.md` |
| Authoring a new spec | `specs/_template.md` + `rules/spec-convention.md` |
| Reviewing a spec with `<!-- REVIEW: -->` markers | `.claude/skills/spec-review/SKILL.md` |
| Building from a settled spec | `.claude/skills/implementation/SKILL.md` + the matching `<file-type>-convention.md` rule |
| Understanding the per-tier validation contract | `docs/validation-contract.md` |
| Understanding the L0 → L1 → L2 → Beyond-L2 layer model | `docs/composition-strategy.md` |
| Picking a unit (em / rem / px) for a CSS custom property | `docs/css-standards.md` § Unit choice in custom-property defaults |
| Authoring a metaobject definition in Shopify admin | `docs/metaobject-definitions.md` |
| Tracing the spec-to-component pipeline end-to-end | `docs/spec-to-component.md` |

## Cross-reference patterns

The category boundaries are sharp:

- **Specs reference docs + rules** for cross-cutting patterns the spec relies on, but the **API surface of the element stays in the spec.** Specs never duplicate a doc's pattern; they cross-reference it ("see `modifier-system.md` for the `data-modifiers` vocabulary").
- **Docs reference specs** for the canonical API of an element the doc discusses. Pattern docs describe *when* and *why*; specs describe *the API* (per `spec-convention.md` § Cross-doc boundaries).
- **Rules reference docs** when the convention depends on a pattern documented elsewhere. Rules don't duplicate spec content — a rule says "follow `<spec-name>.md`"; the rule's job is the authoring discipline, not the contract.
- **Skills reference specs + rules + docs** as runbook inputs. Each phase skill names the files an agent should read before starting.

## Content placement rule

When new content earns a home:

| The content describes … | It belongs in … |
|---|---|
| One element's API / behavior / validation | A spec |
| A pattern referenced by 2+ rules | A new doc |
| A pattern referenced by 2+ specs (but not rules) | A new doc (same threshold; see `CLAUDE.md`) |
| A pattern referenced by exactly 1 rule or 1 spec | Inline in that rule / spec |
| Authoring discipline for a specific file type (`.liquid`, `.js`, `.css`, `.md`) | A rule (or a section in an existing rule) |
| A phase-specific runbook (when to do what) | A skill |

Bias toward inlining until the 2+ threshold is crossed. Extraction is a deliberate move once the pattern recurs, not a default.

## Per-category navigation

### Specs (`.context/specs/`)

Organized by composition layer in `specs-index.md`:

- **Substrate** — metaobjects + utility snippets + utility-JS + utility-CSS. Foundation.
- **Layer 0 — Snippets** — pure rendering primitives. Block-backed or sub-component.
- **Layer 1 — Theme blocks** — schema wrapper around an L0 primitive.
- **Section host** — `section.liquid` carrying L2 presets.
- **Layer 2 — Presets** — saved compositions of L1 blocks (deferred; see `BACKLOG.md`).
- **Beyond L2** — specialized sections (deferred).

The index entry is one line per spec with a tight purpose summary. Click through for the full contract. Status suffix `(planned)` vs `(shipped — retrofit)` distinguishes spec-ahead-of-implementation from retrofit specs of shipped elements.

### Docs (`.context/docs/`)

Two flavors:

**Orientation docs** — entry points for understanding the system. Exempt from the 2+ rule reference threshold:
- `architecture.md` — codebase layout
- `knowledge-architecture.md` — this doc (knowledge layout)
- `composition-strategy.md` — layer model + per-section decision flow

**Pattern docs** — patterns referenced from 2+ specs or rules:
- `css-standards.md` — cascade layers, specificity discipline, focus / motion, unit choice
- `html-standards.md` — semantic HTML conventions
- `modifier-system.md` — `data-modifiers` vocabulary
- `dynamic-style-pattern.md` — per-instance Liquid-computed CSS
- `asset-loading.md` — where component CSS / JS lives
- `metaobject-definitions.md` — Shopify admin setup contract
- `design-system-metaobjects.md` — consumer patterns across metaobject types
- `validation-contract.md` — per-tier validation harness shapes
- `validation.md` — implementation manual for validation pages
- `spec-to-component.md` — spec → ship pipeline
- `theme-root.md` — bleed grid + rhythm cascade contract
- `subgrid-migration.md` — historical record of the structural overhaul
- `container-patterns.md` — gutter / gap / inner padding model
- `locale-conventions.md` — locale file structure
- `liquid-dates.md` — Liquid date arithmetic + locale-aware date translation
- `schema-conventions.md` — Shopify schema patterns
- `specialized-section-pattern.md` — Bucket B section authoring
- `versioning-and-changelog.md` — version/changelog discipline
- `metafield-patterns.md` — metafield traversal patterns

### Rules (`.context/rules/`)

Per-file-type authoring conventions:

- `snippet-convention.md` — `snippets/*.liquid` authoring
- `block-convention.md` — `blocks/*.liquid` authoring
- `section-convention.md` — `sections/*.liquid` authoring
- `js-asset-convention.md` — `assets/*.js` authoring
- `spec-convention.md` — `.context/specs/*.md` authoring
- `reference-voice.md` — doc / spec / rule voice (declarative, no journey residue)
- `a11y-conventions.md` — accessibility patterns
- `icon-convention.md` — SVG icon authoring
- `liquid-*.md` — Liquid idiom rules (array building, object construction, filter gotchas)

Rules are loaded by globs (per the rule's frontmatter); editing a matching file pulls the rule into agent context automatically.

### Skills (`.claude/skills/`)

Six phase skills + one cleanup skill:

- `triage/SKILL.md` — phase 1: business need → layered work plan
- `spec-author/SKILL.md` — phase 2: draft spec
- `spec-review/SKILL.md` — phase 3: close review cycle
- `implementation/SKILL.md` — phase 4: build code
- `validation/SKILL.md` — phase 5: build validation page
- `audit/SKILL.md` — phase 6: drift-fix cycle close-out
- `playwright-cleanup/SKILL.md` — utility: clean Playwright debug artifacts

Skills are invoked explicitly when entering a phase. They name their inputs, checklist steps, done state, and handoff.

## Always-on context budget

Per `CLAUDE.md`, the always-on Liquid context (auto-loaded rules + matching convention) budget caps at ~400 lines per edit. Re-tally on rule edits; the table in `CLAUDE.md` tracks current measurements.

## Working with the four categories

When a question arises during work:

1. **Element-specific** (e.g., "what does `button` accept as `link`?") → spec
2. **Cross-cutting pattern** (e.g., "how should I emit `data-modifiers` values?") → doc
3. **Authoring discipline** (e.g., "how do I structure a new snippet's `{% doc %}` block?") → rule
4. **Workflow question** (e.g., "what's the spec-review phase's checklist?") → skill

If you can't answer the question from any of these, it's a real gap — propose where the answer should live before authoring.

## Related

- `architecture.md` — codebase-layer counterpart to this doc
- `composition-strategy.md` — the layer model specs map onto
- `spec-to-component.md` — the 6-phase pipeline tying skills to specs
- `CLAUDE.md` — project-level conventions including the 2+-reference doc-extraction guideline
