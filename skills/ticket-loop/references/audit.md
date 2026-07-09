# Audit — feature ↔ intent (loop-back gate)

Judge whether the shipped feature delivers the *intent* — not whether the code matches the spec
(that was `validation`'s job), but whether spec + code + validation together answer what was
actually asked. This is the terminate oracle's reviewed-vs-intent half. It writes no history; its
only output is a verdict that either passes the loop to `close` or loops back to reopen a diamond.

## Inputs

- The **prompt anchor** (raw intent, captured at triage) + the **plan anchor** (the agreed scope).
- The shipped spec + code + validation of this cycle.

## The review

Re-read the prompt anchor first — the untouched intent, before the loop interpreted it (this is
why triage anchors it: audit re-reads it even after compaction). Then, across the shipped result:

1. Map each stated need to where it's delivered; confirm the feature does what the prompt asked.
2. Check whether the contract captured the intent, or the spec quietly narrowed or widened it.
3. Check whether the build delivered the contract, and whether the validation matrix left a gap.
4. Scope check: flag anything shipped that wasn't asked (creep) or asked but not shipped (miss).
5. For a change to a shipped element, check whether it disturbed intent already honored by its
   consumers.

## The loop-back gate

Weight scales to scope — a typo is a glance ("yes, the fix matches the ask"); a new primitive
earns a real intent read. On doubt, do not proceed — loop back:

- **Intent not captured by the contract** → reopen **Diamond 1** (back to `spec`): the spec is
  amended through its REVIEW gate, then the loop flows forward again.
- **Contract not delivered by the build**, or a gap the matrix missed → reopen **Diamond 2** (back
  to `implementation`; `validation` re-runs after).
- **Confirmed** → the feature answers the intent; proceed to `close`.

Audit merges nothing and commits nothing. A loop-back returns through the diamond itself; each
reopen re-enters that diamond's own gate (D1's REVIEW, D2's validation), which bounds churn.

## Done state

- Every stated need mapped to its delivery, or a miss/creep surfaced.
- Verdict on the working surface (chat), not in git: **confirm → `close`**, or **loop-back → the
  named diamond**, with the reason.
