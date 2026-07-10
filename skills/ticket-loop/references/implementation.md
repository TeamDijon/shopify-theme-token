# Implementation — Diamond 2 diverges

Build code to match the settled spec. The spec is the contract; this step makes file state match
it. Output: code matching the spec's API + Behavior + CSS + Locale-keys, theme-check clean, with
the spec's `Implementation` pin and `Reconciled` date refreshed.

Implementation starts from an already-reviewed contract: the spec cleared the REVIEW gate at D1
convergence, so no "is the spec reviewed?" check runs here — the conductor guarantees it.

## Inputs

- The settled spec (`Reviewed: <date>`), its `Implementation` field naming target file(s) (or
  `pending` for a first build).
- The matching convention: `snippet-convention.md`, `block-convention.md`,
  `section-convention.md`, `js-asset-convention.md`.

## Build

1. Read the spec end-to-end — API, Output shape, CSS, CSS custom properties, Behavior, Locale
   keys, and the Validation matrix (it tells you the API surface to exercise).
2. Identify target files from `Implementation`: shipped spec → the files exist, you edit; first
   build → the field reads `pending`, you create per the matching convention.
3. **New files** follow the convention exactly — version header, changelog (omitted on v1.0.0),
   `{% doc %}`, logic, output, optional `{% stylesheet %}`/`{% javascript %}` (snippets); render
   call + schema, no logic/markup (blocks); body + schema with `"tag"`/`"class"`/blocks whitelist
   (sections); JSDoc `@module`+`@version` + named exports (JS).
4. **Updates** apply spec-delta by spec-delta: API additions → param resolution + conditionals;
   Behavior changes → logic; CSS additions → stylesheet rules; locale-key additions →
   `locales/en.default.json` + `locales/fr.json`.
5. Bump the version of every file edited — major (breaking) / minor (additive) / patch (fix or
   contract-neutral) — with a changelog entry per file (Liquid: top `{% comment %}` `Changelog`
   block; JS: `Changelog` in the module JSDoc).
6. Update the spec's `Implementation` pin → the new `file vX.Y.Z` pairs (both files, for pairs).
7. Update `Reconciled` → today, with a one-line note describing the pass.
8. First build only → flip the spec header `Status: spec` → `Status: shipped`.
9. Run `theme-check` — zero offenses.
10. Light visual smoke via the dev server + Playwright if the code is renderable; catch obvious
    regressions.

## Optional mid-build pause (intent-driven)

Fires only if the ticket/intent explicitly asked for a checkpoint (e.g. "let me see the API
before you build the CSS"). It is not a standard gate — absent an explicit ask, build straight
through to `validation`.

## Commits

All on the `loop/<slug>` branch — code and the spec's pin/`Reconciled`/`Status` edits ride the
same branch (the spec is colocated on `main`'s history now, so there is no separate context-branch
commit for these). One commit per logical unit, or one for the whole element if cohesive.

Each commit's body (2nd line onward) carries that change's reasoning — the why, not a restated
what. With the squash dropped at `close`, these bodies persist on `main` as the per-change
contract, so write them for a future reader, not just this cycle.

## Done state

- Implementation file(s) match the spec's API + Behavior + CSS + Locale-keys.
- Versions bumped with changelog entries; spec pin reflects them; `Reconciled` is today.
- `Status: shipped` if first build. theme-check clean; no visual regressions.
- Commits staged on `loop/<slug>`.
