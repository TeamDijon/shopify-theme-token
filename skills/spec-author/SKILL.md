---
name: spec-author
description: Author a new (or revise an existing) spec under `.context/specs/<name>.md` following `_template.md` + `spec-convention.md` + `reference-voice.md`. Reads sibling specs at the same layer for calibration; updates `specs-index.md`; stages a context-branch commit. Output: a complete spec with `Reviewed: pending`, ready for review. Invoke when a triage punch list names a spec to draft, when a developer directly requests spec authoring, or when an existing spec needs substantial rework. Pipeline phase 2 of 6.
status: draft (refine after first use)
---

# Spec authoring

Draft a spec under `.context/specs/` following the template + convention. The output is a complete spec file with `Reviewed: pending` and an index entry, ready for the spec-review phase.

## Trigger

A spec is named in a triage punch list (or directly requested), and the design questions blocking authoring have been resolved.

## Inputs

- Target spec name (kebab-case, matches the element's filename)
- Layer assignment (substrate / 0 / 1 / 2 / 3 / 4)
- Type (snippet / block / preset / specialized section / metaobject / utility-css / utility-js)
- Status target (`spec` for unshipped, `shipped` for retrofit of existing code)
- Any design constraints captured during triage

## Checklist

1. **Verify target path** `.context/specs/<name>.md`. Confirm the name is kebab-case matching the element's filename (`utility--color-contrast`, `star-rating`, etc.).
2. **Read the template** `.context/specs/_template.md`.
3. **Read 2–3 sibling specs** at the same layer + type for calibration. For substrate / L0 / L1, prefer recently-reviewed shipped specs that match the type (snippet, metaobject, JS module).
4. **Read the convention** `.context/rules/spec-convention.md` for current header fields, ordering, and style.
5. **Read the voice rule** `.context/rules/reference-voice.md` for prose style — declarative, no journey residue.
6. **Read supporting context** as needed for the spec's domain:
   - Metaobject specs → `metaobject-definitions.md` + `design-system-metaobjects.md`
   - Utility-snippet specs → `asset-loading.md` + sibling utility specs
   - Block / section specs → the implementation file if shipped (cross-check API against current code)
   - JS specs → `js-asset-convention.md` + sibling JS specs
7. **Draft the spec** following the template structure. Every section. N/A with one-clause reason when a section doesn't apply.
8. **Header field discipline** per `spec-convention.md`:
   - Each field its own paragraph (blank lines between)
   - `Reviewed: pending` always present (per the convention's universal-placeholder rule)
   - `Reconciled: <date>` present iff `Status: shipped`
   - `Implementation: pending` for unshipped, or pinned file:version pairs for shipped
9. **Update `specs-index.md`** with a one-line entry under the correct layer section. Keep the entry tight: name + 1–2 sentence summary of what the element does.
10. **Stage commit on context branch** — spec file + index update in one commit.

## Done state

- Spec file exists at the target path with every required header field + every relevant section filled
- `Reviewed: pending` placeholder present
- Index entry added under the matching layer
- Context branch commit staged with a clear message describing the new / updated spec

## Handoff

The spec is ready for the **spec-review** phase. The developer reads it; the agent works on the next thing in parallel until review feedback arrives.
