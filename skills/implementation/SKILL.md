---
name: implementation
description: Build or update the code described by a settled spec — match the spec's API + Behavior + CSS + Locale-keys, follow the relevant convention (snippet / block / section / js-asset), bump implementation versions with changelog entries, update the spec's `Implementation` pin + `Reconciled` date, flip `Status: spec` → `shipped` on first build, run theme-check, light visual smoke if renderable. Invoke when a settled spec lacks matching implementation, or when implementation drifted from a recently-amended spec. Pipeline phase 4 of 6.
status: draft (refine after first use)
---

# Implementation

Build or update the code described by a settled spec. The spec is the contract; this phase makes the file state match the contract. Output: code files matching the spec's API + Behavior + CSS + Locale-keys sections, theme-check clean, with the spec's `Implementation` pin and `Reconciled` date refreshed.

## Trigger

A spec with `Status: shipped` describes a contract that the implementation file doesn't match (drift or absence), or a spec with `Status: spec` is approved for first build.

## Inputs

- Spec (ideally with `Reviewed: <date>`; see below if `pending`)
- Spec's `Implementation` field naming target file(s) (or `pending` for first build)
- Convention docs the implementation must follow (`snippet-convention.md`, `block-convention.md`, `section-convention.md`, `js-asset-convention.md`, etc.)

### When the spec is `Reviewed: pending`

Implementation reads better starting from a reviewed spec — the spec-review phase catches API ambiguities, voice drift, and design oversights before code commits to them. When firing implementation against a spec whose `Reviewed` field is still `pending`, surface this to the developer before proceeding:

> "This spec hasn't been reviewed (`Reviewed: pending`). The spec-review phase usually catches API ambiguities and design oversights before implementation locks them in. Do you want to:
> (a) Run a quick review pass first
> (b) Proceed with implementation now (the developer signs off implicitly by greenlighting)
> (c) Pause until the spec is reviewed in a separate cycle"

This is an informational gate, not a formal precondition. The developer's confirmation routes the flow.

## Checklist

1. **Read the spec end-to-end.** Note every section that informs the implementation: API, Output shape, CSS, CSS custom properties, Behavior, Locale keys, Validation matrix (informs the API surface to exercise).
2. **Identify target files** from the spec's `Implementation` field:
   - For shipped specs: the listed file(s) already exist; you'll edit
   - For unshipped specs: the field reads `pending`; you'll create the file(s) per the matching convention
3. **For new files**, follow the relevant convention exactly:
   - Snippets: version header, changelog (omitted on v1.0.0), `{% doc %}` block, logic, output, optional `{% stylesheet %}` / `{% javascript %}`
   - Blocks: version header, changelog, `{% render %}` call, schema (no logic, no markup)
   - Sections: version header, changelog, body, schema with `"tag": "section"`, `"class"`, blocks whitelist
   - JS assets: JSDoc with `@module` + `@version`, changelog, named exports only
4. **For updates to existing files**, apply changes spec-delta-by-spec-delta:
   - API additions → new param resolution + render conditionals
   - Behavior changes → corresponding logic adjustments
   - CSS additions → new rules in the stylesheet block
   - Locale-key additions → add to `locales/en.default.json` + `locales/fr.json`
5. **Bump implementation versions** for every file edited:
   - Major (`vX.0.0`) for breaking API changes
   - Minor (`vX.Y.0`) for additive changes
   - Patch (`vX.Y.Z`) for fixes / contract-neutral refactors
   - Add a changelog entry per file. Liquid: a top-of-file `{% comment %}` block headed `Changelog` with `- vX.Y.Z — note` bullets. JS: a `Changelog` section inside the module-level JSDoc block (with `@module` + `@version` tags) using the same bullet format.
6. **Update the spec's `Implementation` pin** to the new file:version pairs.
7. **Update the spec's `Reconciled` date** to today, with a brief note describing the implementation pass.
8. **For first-time builds**, flip the spec's `Status: spec` → `Status: shipped` and update specs-index.md entry status `(planned)` → `(shipped — first implementation)`.
9. **Run `theme-check`** — must report zero offenses.
10. **Light visual smoke** via the dev server + Playwright if the implementation is renderable. Catch obvious rendering regressions.
11. **Stage commits:**
    - Main branch: code changes (one commit per logical unit, or one for the whole element if cohesive)
    - Context branch: spec pin + Reconciled + Status updates

## Done state

- Implementation file(s) match the spec's API + Behavior + CSS + Locale-keys
- Versions bumped with changelog entries
- Spec pin reflects the new version(s), Reconciled is today
- `Status: shipped` if first build
- theme-check: zero offenses
- Visual smoke: no regressions
- Commits staged in the correct branches

## Handoff

The implementation is ready for the **validation** phase. The spec's `Validation` section describes the page to build / matrix to exercise.
