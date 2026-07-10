# Context — governance drift (decoupled, deferrable)

Reconcile the `.context` governance layer (rules / docs / skills) with what the cycle changed.
Runs *after* `close`, with `main` parked — the feature is already shipped, so nothing here
contaminates it and the whole step defers cleanly to another session. A contract change is the
usual trigger; a non-contract cycle (typo, fix) is usually a no-op — but if the cycle surfaced
governance debt regardless (a rule that misled, a doc gap, a loop-mechanics friction worth
persisting as a `ticket-loop`/rule edit), capture it here rather than off-label.

Governance lives on the context branch. Pin drift is already gated: context-lint fails
`npm run check` on any stale spec pin — sibling specs included — via check 1 (specs still under
`.context/specs/`) and check 4 (colocated specs). So there is no manual pin sweep here. This step
is the qualitative drift a lint can't see — including the semantic spec fields no lint reads.

## Inputs

- The merged cycle's changes (`git diff` across the cycle on `main`) + the spec(s) touched.
- The `.context` rules / docs the element relies on.

## The governance scan

Contract changes drive most of this; a non-contract cycle runs only the loop-mechanics check
(below) if the cycle surfaced friction worth persisting.

1. **Inventory what moved:** new/renamed CSS variables, modifiers, class names, JS exports,
   selectors, handles.
2. **Grep `.context` for each symbol.** For each hit outside the element's own spec: is the
   reference accurate? does the description still match behavior?
3. **Rules under `.context/rules`:** did the cycle change a pattern a convention rule documents?
   Update it, or decide the new pattern stays element-local.
4. **Metaobject docs** (`metaobject-definitions` / `design-system-metaobjects`) if a metaobject
   moved: runtime notes + cross-references accurate.
5. **Earned doc:** a pattern now referenced by 2+ specs and documented nowhere → candidate for a
   new `.context/docs` file (per the repo's 2+ placement guideline).
6. **Sibling-spec cross-references the lint can't read:** for a sibling spec that references a file
   this cycle touched, confirm its `Consumers` and `Whitelisted by` fields are still accurate — pin
   freshness is gated, these semantic fields are not.
7. **Loop-mechanics friction** (runs on any cycle, contract or not): a step reference that misled,
   a gate that misfired, routing that didn't fit the scope → this is governance on the loop itself.
   Fix it as a `ticket-loop`/rule edit inline (or defer it — below). It does **not** go in
   `_spec-feedback.md`, whose slugs target the spec system, not skills.

Main-side spec-pin fixes are not done here (main is parked); they belong on the feature branch
before `close`, and the gate enforces them regardless.

## Three outcomes — apply inline by default

Each governance change the scan surfaces resolves one of three ways. **Applying inline is the
default** — the step runs with `main` parked, so there is room to just do the governance work now:

- **Applied now (default)** → a normal governance commit on the context branch.
- **Deferred (rare escape hatch)** → only when the work is genuinely larger than this cycle should
  absorb. Record a lightweight `context-rec` empty commit so it is not lost:

      git -C .context commit --allow-empty \
        -m "context-rec(<el>): <what>" \
        -m "Status: pending" -m "Source: <main sha>" -m "Kind: drift-fix|earned-doc"

- **Rejected** → dropped; nothing recorded.

A deferral is approved-but-undone debt, never unvetted speculation — the default is to do it now,
not queue it. Discover open recs with `git -C .context log --grep="^context-rec("` (anchored so it
matches only enqueue commits, not any commit mentioning the term; open = not yet referenced by a
`Closes-rec:` trailer). The queue is drained opportunistically at `triage` when the element next
comes into scope; the commit that pays a rec carries a `Closes-rec: <rec-sha>` trailer.

## Done state

- Governance reconciled with the cycle's contract change (or a non-contract cycle that either
  no-ops or captures loop-mechanics friction).
- Each surfaced change applied inline (default) / deferred (`context-rec`, rare) / dropped.
- Nothing written for rejected items; deferrals live as `context-rec` commits, not tree files.
