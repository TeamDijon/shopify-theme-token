# Close — git hygiene on `main` + go/no-go merge gate

The only place the loop merges to `main`. Surface a diff + verdict every time; block for approval
only when the change touches the contract or the intent asked for a pre-merge look. On go, merge
the feature branch (`--no-ff`, anchors kept), and clean up.

## Inputs

- The `loop/<slug>` branch (anchors + spec + code + validation source), with `audit` confirmed.

## 1. Surface the verdict — always (cheap)

Produce the branch diff against `main` (`git diff main...loop/<slug> --stat` + the substantive
hunks) and a one-paragraph verdict:

- what shipped (element, version bumps);
- **contract-touching?** — spec API / Behavior / schema changed, or a minor/major version bump, or
  a new element → **yes**; a patch-level fix, doc, or typo → **no**;
- anything the intent flagged for a pre-merge look.

This surfaces on every close regardless of scope — it is the loop's receipt.

## 2. The go/no-go gate — blocks conditionally

Block for developer approval when **contract-touching OR intent-requested**. Otherwise
(non-contract and unrequested) proceed autonomously — the verdict already surfaced. Gate weight
scales to scope: a typo self-approves on a glance; a new primitive's contract blocks for a real
read.

On **no-go**, the change does not merge: route the objection back through audit's loop-back — a
contract objection reopens Diamond 1 (`spec`), a build objection reopens Diamond 2
(`implementation`) — then the loop flows forward to `close` again.

## 3. On go — merge (`--no-ff`), clean up

Merge with a merge commit; the whole branch rides onto `main` intact — the prompt/plan anchors
stay as permanent intent records (audit trail, not scaffolding), and every commit keeps its
reasoning body:

    git switch main
    git merge --no-ff loop/<slug>   # merge commit; anchors + real commits preserved
    git branch -d loop/<slug>

`git log --first-parent` gives the clean per-ticket overview (one line per merge) a squash would
have produced, while the full log preserves each change's why. Nothing is dropped, and bisect
stays clean: the anchors are empty (tree-neutral) commits, and spec + code + test commit together
within the branch.

The merge is `main`-only. Governance (the context branch) is untouched here — it is the next step,
`context`.

## Done state

- Verdict surfaced (diff + contract-touching call) on every close.
- Contract-touching / intent-requested changes approved before merge; others merged autonomously.
- Feature on `main` via a `--no-ff` merge commit; anchors preserved as intent records; `loop/<slug>` deleted.
