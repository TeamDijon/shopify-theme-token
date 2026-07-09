# Close — git hygiene on `main` + go/no-go merge gate

The only place the loop merges to `main`. Surface a diff + verdict every time; block for approval
only when the change touches the contract or the intent asked for a pre-merge look. On go, merge
the feature branch, drop the provisional anchors, and clean up.

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

## 3. On go — merge, drop anchors, clean up

The prompt/plan anchors were loop scaffolding (durable state *during* the cycle); they do not
persist on `main`. Squash-merge collapses the branch's tree onto `main` in one commit and drops
the two empty anchors automatically:

    git switch main
    git merge --squash loop/<slug>
    git commit          # message names the element + what shipped
    git branch -D loop/<slug>

When the branch's internal commits are worth preserving (a multi-spec ticket), replay them past
the anchors instead of squashing (`-i` is unavailable, so use `--onto`):

    git switch loop/<slug>
    git rebase --onto main <plan-anchor-sha>   # drops both empty anchors, keeps real commits
    git switch main && git merge --ff-only loop/<slug> && git branch -d loop/<slug>

`<plan-anchor-sha>` is the `loop-plan(...)` commit — `git log --oneline main..loop/<slug>` lists it
as the second commit up from the branch base (prompt anchor first, plan anchor second).

The merge is `main`-only. Governance (the context branch) is untouched here — it is the next step,
`context`.

## Done state

- Verdict surfaced (diff + contract-touching call) on every close.
- Contract-touching / intent-requested changes approved before merge; others merged autonomously.
- Feature on `main`; anchors gone from permanent history; `loop/<slug>` deleted.
