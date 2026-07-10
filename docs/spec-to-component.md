# Spec → component pipeline

The loop that takes a UI need from request to shipped, validated, merged element. This doc is the orientation-level map; the executable runbook lives in the `ticket-loop` skill.

## Colocated-spec model

Each element's spec lives beside the code it governs on `main`, discovered by glob `**/*.spec.md` — there is no maintained index. Location follows where the element's logic lives:

- **snippet, or block+snippet pair** → `snippets/<name>.spec.md` (the snippet is the logic owner; a pair pins both `snippets/<name>.liquid` and `blocks/<name>.liquid`).
- **block-only** → `blocks/<name>.spec.md`.
- **section host** → `sections/section.spec.md`; **layout** → `layout/layout.spec.md`.
- **utility JS / CSS** → `assets/<name>.spec.md`.
- **metaobject** → `sections/<name>.spec.md`, beside its permanent showcase (`sections/<name>.liquid` + `templates/page.<name>.json`).

The spec is the source of truth for the element's API, output, behavior, and validation. Its pin block ties it to the file version(s) it governs; `.scripts/context-lint.mjs`'s `colocation` check verifies the pins match. The template stays at `.context/specs/_template.md`.

## The loop

A unit of work runs through the single `ticket-loop` skill (`.claude/skills/ticket-loop/SKILL.md`) — eight steps across two divergence→convergence diamonds plus a decoupled tail:

    Diamond 1 (contract)     Diamond 2 (solution)     Tail (decoupled)
    triage ──▶ spec          impl ──▶ validation      audit ▷ close ▷ context ▷ evals

1. **triage** — open the feature branch + prompt/plan anchors; classify layer and validation tier; enumerate affected elements and spec status.
2. **spec** — settle the colocated contract; the **REVIEW gate** awaits `<!-- REVIEW: -->` markers / approval, then applies resolutions.
3. **implementation** — build code to match the settled spec; version bumps + changelog.
4. **validation** — confirm against the spec's API matrix.
5. **audit** — feature↔intent review; the **loop-back gate** reopens a diamond on doubt.
6. **close** — the **go/no-go merge gate**; the only merge to `main`.
7. **context** — governance drift, applied on the `context` branch.
8. **evals** — a thin per-ticket retro into `.context/specs/_spec-feedback.md`.

Each step's procedure lives in `.claude/skills/ticket-loop/references/<step>.md`, loaded only when that step runs. Gate weight scales to scope: a typo flows light, a new primitive carries full gates.

## Validation model

Three surfaces (see `validation-contract.md` and `validation.md`):

1. **Generate-and-drop** (default) — block primitives and L2 preset compositions. A colocated `<name>.validation.json` source is staged by `.scripts/validation-generate.mjs` into the generic `sections/validation.liquid` harness, reachable at `?view=validation`, tested by the colocated `<name>.test.js` (Playwright), then removed by `.scripts/validation-clean.mjs`. The serialized orchestrator `npm run test:e2e` (`.scripts/validation-e2e.mjs`) loops each element generate → test → drop. Block primitives live at `snippets/<name>.{validation.json,test.js}`; presets at `sections/section--<preset>.{validation.json,test.js}`.
2. **Per-snippet committed harness** — snippet-only primitives (`image`, `video`) whose case matrix is Liquid `{% render %}` logic. The colocated source names `"harness": "validation--primitive--<name>"`; the committed harness `sections/validation--primitive--<name>.liquid` stays; the template still generate-and-drops.
3. **Permanent page showcase** — substrate metaobjects: bare `sections/<name>.liquid` + committed `templates/page.<name>.json`, merchant-browsable via a Page with that template assigned in admin. Eyeballed, no test.

## Git strategy

- **`main`** — theme code (snippets / blocks / sections / assets / locales / templates) plus the colocated element contracts (`**/*.spec.md`, `**/*.validation.json`) and their tests.
- **`context`** — governance only (rules, docs, skills), orphan branch surfaced as the `.context/` worktree.
- **Per-unit feature branch `loop/<slug>` off `main`** — opens with empty prompt/plan anchor commits; spec + code + colocated test commit together on the branch. `close` merges to `main` with `git merge --no-ff` (no squash — anchors and reasoning-carrying commit bodies persist). Commit bodies (2nd line onward) carry each change's reasoning.

## Predictable conflict surfaces

When units run in parallel, these files attract conflicts. All are append-only and resolve at merge.

| File | Why it conflicts | Mitigation |
|---|---|---|
| `assets/layer-*.css` | Any substrate addition | Substrate lane; gate dependent primitives |
| `snippets/utility--css-variables.liquid` | Any new metaobject loop | Same |
| `locales/en.default.json`, `locales/fr.json` | Locale keys per element | Append-only |

Rule: one element per unit; substrate changes never bundle into an element unit.

## Related

- `composition-strategy.md` — layer model and decision flow
- `validation-contract.md` — per-tier validation contract
- `validation.md` — the three validation surfaces + generate-and-drop mechanics
- `.context/specs/_template.md` — spec template
- `.claude/skills/ticket-loop/SKILL.md` — the executable pipeline runbook
