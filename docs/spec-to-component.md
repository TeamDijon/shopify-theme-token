# Spec → component pipeline

The loop that takes a UI need from ticket to shipped, validated element. Describes the workflow as it should run end-to-end, regardless of how much is automated today.

## The loop

Six phases. Each produces an artifact that gates the next. The `.claude/skills/<phase>/` skills carry the per-phase runbooks (triage, spec-author, spec-review, implementation, validation, audit).

### 1. Triage

Ticket appears (Linear or equivalent). Classify the element against `composition-strategy.md` — which composition layer (L0, L1, L2, or Beyond L2), which validation tier (per `validation-contract.md`). Layer placement settles here; the downstream spec stage describes the contract at the assigned layer, not the layer choice itself. Confirm scope: one element per ticket. Substrate changes get their own lane and never bundle into a primitive ticket.

**Foundational track exception.** Substrate elements (metaobjects, utility snippets, JS modules) and retrofits of pre-existing primitives don't enter via tickets. Layer assignment comes from architectural design (substrate) or from existing code (retrofits). These skip Triage formally; the spec stage records the contract at the inhabited layer. Layer-tension observations live in the spec's Purpose or Implementation-time decisions section.

### 2. Spec authoring

Author the spec at `.context/specs/<name>.md` per `specs/_template.md`. The Validation section names tier, pages, API surface, edge cases, and assertions. Spec lands on the `context` branch as its own commit with `Reviewed: pending`, ready for the review phase.

### 3. Spec review

Developer reads the spec end-to-end and signs off via `Reviewed: <date>`. When the developer places inline `<!-- REVIEW: -->` markers on the spec, the review phase closes by applying the settled marker resolutions, propagating any code-side renames or behavioral changes the review triggered, bumping the `Reviewed` date, and auditing adjacent docs for drift. Sign-off means the API, behavior, validation surface, and out-of-scope set are settled.

The implementation phase reads better starting from a reviewed spec — when firing implementation against a `Reviewed: pending` spec, the developer should confirm the spec is settled enough to build (informational gate, not formal enforcement; see the `implementation` skill).

### 4. Implementation

Per-ticket branch off `main`. Produce snippets / blocks / sections / assets / locales per the spec. For new L1 blocks, update each whitelist named in the spec's `Whitelisted by` field (`section.liquid`, `group`, `columns`, etc.) — the spec is the checklist. Theme-check passes; pre-commit hooks pass. Implementation matches the spec exactly — divergences trigger a spec amendment, not silent drift.

### 5. Validation

Same ticket branch. Author the validation page(s) per the spec's Validation section. The JSON template bakes the matrix for Tiers 2/3/4; the section iterates `metaobjects.<type>.values` for Tier 1a. Hub registers an anchor for the new page. Page is reachable at `?view=validation--<...>`.

### 6. Audit (cycle close-out)

Scan supporting docs / rules / sibling specs for drift introduced during the cycle. Grep cross-references to changed symbols, verify pin versions on sibling specs, update `specs-index.md` status entries, flag changelog discipline gaps. Output: drift fixes committed on context or flagged for follow-up. Run before declaring the unit of work done. Sign-off triggers merge to `main`. Spec's `Status` field updates from `spec` to `shipped`.

## Git strategy

- **`main`** — theme code (snippets/blocks/sections/assets/locales/templates).
- **`context`** — specs + rules + docs, orphan branch surfaced as the `.context/` worktree.
- **Per-ticket branches off `main`**: `primitive/<name>`, `block/<name>`, `preset/<name>`, `section/<name>`, `substrate/<area>`.

Spec lands on `context` first (its own commit). Implementation + validation land on the ticket branch off `main`. Ticket branch merges to `main` on review sign-off. Spec's `Status` update is a follow-up commit on `context`.

## Predictable conflict surfaces

When tickets run in parallel, these files attract conflicts. Three are append-only and trivial to resolve; two need coordination.

| File | Why it conflicts | Mitigation |
|---|---|---|
| `assets/layer-*.css` | Any substrate addition | Substrate ticket lane; gate dependent primitives |
| `snippets/utility--css-variables.liquid` | Any new metaobject loop | Same |
| `sections/validation.liquid` | Hub anchor per new validation page | Append-only; resolve at merge |
| `.context/specs-index.md` | Every new spec | Append-only |
| `locales/en.default.json`, `locales/fr.json` | Locale keys per element | Append-only |

Rule: one element per PR; substrate changes never bundled into an element PR.

## Today vs future state

**Today.** User-driven dialogue with AI: spec authored conversationally per template, implementation by AI under user direction, validation page produced alongside, user signs off visually. No agent automation, no green test report — Liquid pages + theme-check + eyeball.

**Future.** Agent boundaries per stage. Triage agent classifies and proposes the spec skeleton. Spec agent fills in the template against user input on open questions. Implementation agent produces files. Validation agent produces harness + assertions (Playwright + Vitest by then). Review remains human. The pipeline stays the same; what changes is who fills each stage.

The contract, spec template, and conflict-surface rules are forward-compatible with both modes.

## Open questions

- **Dependency surfacing**: how does a ticket declare "this depends on substrate change X"? Possibly a manifest field in the spec; possibly Linear-side tagging. Settles once Linear integration is in scope.
- **Deferred specs**: today specs are authored ahead of implementation freely. Whether the queue eventually needs explicit staging (spec written but parked) depends on whether bottlenecks emerge.
- **Multi-locale validation**: today one-off scheme/locale switches per page. Future matrix expansion across locales × schemes lands with Playwright fixtures.
- **Spec amendment protocol**: if implementation reveals a spec error, the spec gets amended and re-signed-off. Cadence and granularity TBD on first occurrence.

## Related

- `composition-strategy.md` — layer model and decision flow
- `validation-contract.md` — per-tier validation contract
- `validation.md` — implementation manual for validation pages
- `specs/_template.md` — spec template
- `specs-index.md` — spec inventory
