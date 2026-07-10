# Spec → component pipeline

The loop that takes a UI need from request to shipped, validated, merged element. This doc is the orientation-level map; the executable runbook lives in the `ticket-loop` skill.

## Colocated-spec model

Each element's spec lives beside the code it governs on `main`, discovered by glob `**/*.spec.md` — there is no maintained index. Location follows where the element's logic lives:

- **snippet, or block+snippet pair** → `snippets/<name>.spec.md` (the snippet is the logic owner; a pair pins both `snippets/<name>.liquid` and `blocks/<name>.liquid`).
- **block-only** → `blocks/<name>.spec.md`.
- **section host** → `sections/section.spec.md`; **layout** → `layout/layout.spec.md`.
- **utility JS / CSS** → `assets/<name>.spec.md`.
- **metaobject** → `sections/<name>.spec.md`, beside its permanent `sections/validation--substrate--<name>.liquid` showcase.

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

Block elements use generate-and-drop. A colocated `<el>.validation.json` source is staged by `.scripts/validation-generate.mjs` into the generic `sections/validation.liquid` harness, reachable at `?view=validation`, tested with Playwright, then removed by `.scripts/validation-clean.mjs`. The serialized orchestrator `npm run test:e2e` (`.scripts/validation-e2e.mjs`) loops each element generate → test → drop.

Permanent bespoke pages remain for substrate metaobject showcases (`sections/validation--substrate--*.liquid` + committed `templates/index.validation--substrate--*.json`), snippet-only primitives (`image`, `video`), and the parked L2 presets (`validation--preset--*`).

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
- `validation.md` — implementation manual for validation pages
- `.context/specs/_template.md` — spec template
- `.claude/skills/ticket-loop/SKILL.md` — the executable pipeline runbook
