# Knowledge architecture

How the `.context/` knowledge layer is organized + where to start depending on what you're doing. Maps the four document categories — **rules**, **docs**, **specs**, **skills** — and the cross-references between them.

For the codebase itself (repo layout, render model, asset pipeline, CSS layers, conventions), see `architecture.md`. This doc is the knowledge-layer counterpart.

## The four categories

| Category | Path | Audience | Role |
|---|---|---|---|
| **Specs** | colocated beside code (glob `**/*.spec.md`) | Authors + agents | Per-element contract — one spec per element (snippet, block, section, metaobject, utility-js, utility-css), living beside the code it governs on `main`. The spec is the **source of truth** for the element's API, output, behavior, and validation. |
| **Docs** | `.context/docs/<topic>.md` | Authors + agents | Cross-cutting patterns referenced by multiple specs or rules. Architecture, composition model, asset loading, naming conventions, validation contract. A pattern earns a doc when **2+ rules or specs reference it**. |
| **Rules** | `.context/rules/<convention>.md` | Authors (per-file glob-loaded) | Authoring conventions for one file type — how to write a snippet, a block, a section, a JS asset, a spec. Loaded into agent context when editing a matching file (per the rule's glob). |
| **Skills** | `.claude/skills/<name>/SKILL.md` | Pipeline runbooks | The `ticket-loop` conductor owns the pipeline end to end; `deflavor` and `playwright-cleanup` are utilities. Invoked explicitly. |

## Where to start

| If you're … | Start here |
|---|---|
| Orienting to the codebase | `architecture.md` |
| Running a unit of work end to end | `.claude/skills/ticket-loop/SKILL.md` |
| Authoring a new spec | `.context/specs/_template.md` + `rules/spec-convention.md` (the spec lands colocated beside its code) |
| Reviewing a spec with `<!-- REVIEW: -->` markers | `.claude/skills/ticket-loop/references/spec.md` |
| Building from a settled spec | `.claude/skills/ticket-loop/references/implementation.md` + the matching `<file-type>-convention.md` rule |
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
- **Skills reference specs + rules + docs** as runbook inputs. Each `ticket-loop` step reference names the files an agent should read before starting.

## Content placement rule

When new content earns a home:

| The content describes … | It belongs in … |
|---|---|
| One element's API / behavior / validation | A spec |
| A pattern referenced by 2+ rules | A new doc |
| A pattern referenced by 2+ specs (but not rules) | A new doc (same threshold) |
| A pattern referenced by exactly 1 rule or 1 spec | Inline in that rule / spec |
| Authoring discipline for a specific file type (`.liquid`, `.js`, `.css`, `.md`) | A rule (or a section in an existing rule) |
| A phase-specific runbook (when to do what) | A skill |

Bias toward inlining until the 2+ threshold is crossed. Extraction is a deliberate move once the pattern recurs, not a default. Orientation docs (`architecture.md`, `knowledge-architecture.md`) are exempt from the threshold — they are entry points, not referenced patterns.

## Per-category navigation

### Specs (colocated, glob `**/*.spec.md`)

Specs live beside the code they govern on `main`, discovered by glob rather than a maintained index. Location follows where the element's logic lives:

- **snippet, or block+snippet pair** → `snippets/<name>.spec.md` (the snippet is the logic owner; a pair pins both `snippets/<name>.liquid` and `blocks/<name>.liquid`).
- **block-only** → `blocks/<name>.spec.md`.
- **section host** → `sections/section.spec.md`.
- **layout** → `layout/layout.spec.md`.
- **utility JS / CSS** → `assets/<name>.spec.md`.
- **metaobject** → `sections/<name>.spec.md`, beside its permanent `sections/validation--substrate--<name>.liquid` showcase.

The colocated pin block ties the spec to the file version(s) it governs; `.scripts/context-lint.mjs`'s `colocation` check verifies the pins match.

The template lives at `.context/specs/_template.md` and per-ticket retro notes accumulate in `.context/specs/_spec-feedback.md`; those are the only spec-layer files that stay under `.context/`.

### Docs (`.context/docs/`)

Two flavors:

**Orientation docs** — entry points for understanding the system. Exempt from the 2+ rule reference threshold:
- `architecture.md` — codebase layout
- `knowledge-architecture.md` — this doc (knowledge layout)
- `composition-strategy.md` — layer model + per-section decision flow
- `dev-environment.md` — serve / deploy / metaobject-provisioning runbook

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
- `spec-convention.md` — colocated `**/*.spec.md` authoring
- `reference-voice.md` — doc / spec / rule voice (declarative, no journey residue)
- `a11y-conventions.md` — accessibility patterns
- `icon-convention.md` — SVG icon authoring
- `liquid-*.md` — Liquid idiom rules (array building, object construction, filter gotchas)

Rules are loaded by globs (per the rule's frontmatter); editing a matching file pulls the rule into agent context automatically.

### Skills (`.claude/skills/`)

One pipeline conductor + two utilities:

- `ticket-loop/SKILL.md` — the conductor: runs a unit of work end to end across eight steps — **triage → spec → implementation → validation → audit → close → context → evals** — arranged as two divergence→convergence diamonds (contract: triage/spec with a REVIEW gate; solution: implementation/validation) plus a decoupled tail (audit=loop-back gate, close=go/no-go merge gate, context=governance, evals=retro). Each step's runbook lives in `ticket-loop/references/<step>.md`, loaded only when that step runs.
- `deflavor/SKILL.md` — utility: rewrite a reference doc in declarative voice.
- `playwright-cleanup/SKILL.md` — utility: clean Playwright debug artifacts.

Skills are invoked explicitly. `ticket-loop` is the single entry point when work begins from a need.

## Always-on context budget

Per `CLAUDE.md`, the always-on Liquid context (auto-loaded rules + matching convention) budget caps at ~400 lines per edit. Re-tally on rule edits; the table in `CLAUDE.md` tracks current measurements.

## Working with the four categories

When a question arises during work:

1. **Element-specific** (e.g., "what does `button` accept as `link`?") → spec
2. **Cross-cutting pattern** (e.g., "how should I emit `data-modifiers` values?") → doc
3. **Authoring discipline** (e.g., "how do I structure a new snippet's `{% doc %}` block?") → rule
4. **Workflow question** (e.g., "what's the spec step's checklist?") → the `ticket-loop` skill + its step reference

If you can't answer the question from any of these, it's a real gap — propose where the answer should live before authoring.

## Related

- `architecture.md` — codebase-layer counterpart to this doc
- `composition-strategy.md` — the layer model specs map onto
- `spec-to-component.md` — the pipeline tying the `ticket-loop` skill to colocated specs
- `CLAUDE.md` — project-level conventions (context system, loop protocol, always-on budget)
