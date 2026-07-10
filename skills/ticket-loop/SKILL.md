---
name: ticket-loop
description: Run a unit of work through the full Token element lifecycle — from a business need or change request to shipped, validated, merged, and governed code. The single adaptive entry point that owns the whole pipeline end to end (triage through evals); start here when work begins from a need, not by invoking an individual phase skill. Use when a new element or change, a feature request, a fix, or a design brief lands.
argument-hint: [request | change description]
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Ticket loop

One adaptive entry for a unit of work: a business need in, shipped + validated + merged +
governed code out. The loop runs as eight steps across two divergence→convergence diamonds
plus a decoupled tail. This body sequences and gates; each step's procedure lives in its
reference, loaded only when that step runs.

## Route first — size the work to set gate weight

Before step 1, read the request (+ any pasted ticket / prompt anchor) and size its scope.
Gate weight scales to scope — the same loop flows a typo far lighter than a new primitive:

- **New element / primitive** — full loop; both human gates carry real weight.
- **Change to a shipped element** — full loop; steps touching unaffected surface pass through.
- **Typo / doc / copy fix** — spec may be a no-op; validation is a smoke; gates are a glance.
- **Governance / review-only** — a `.context` rule/doc/skill edit, a spec review, or a process
  change with no `main` element contract in play: `spec` / `implementation` / `validation` are
  N/A; the work is the `context` step (or a direct context-branch edit), and `close`'s merge gate
  applies only if `main` was touched.

When scope reads ambiguously (a "change" that may really be a new primitive), size up — take the
heavier gate weight and confirm with the developer rather than defaulting light.

Scope is Linear-agnostic: if a Linear MCP is connected the agent may fetch the ticket, else
the human pastes it. The prompt anchor (step 1) is the durable interface, not Linear.

## Delegate for altitude

The conductor sequences, gates, and reviews — it should not sink into doing every step inline.
Spawn subagents to reach the right altitude and preserve the fresh eyes the terminate oracle's
"reviewed against intent" check depends on: a nested subagent for a deep build, fanout for a
parallel work-list. No agent-count prescription — adapt to the ticket; the point is staying high
enough to judge the result against the prompt anchor.

## The spine

    Diamond 1 (contract)        Diamond 2 (solution)        Tail (decoupled)
    triage ──▶ spec             impl ──▶ validation         audit ▷ close ▷ context ▷ evals
    (diverge)  (converge)       (diverge)  (converge)       loop-   go/no   gov-    retro
               REVIEW gate      opt. mid-pause              back    -go     drift

1. **triage** → ${CLAUDE_SKILL_DIR}/references/triage.md — open the feature branch + prompt/plan anchor commits;
   drain any `context-rec`s for elements in scope; enumerate affected primitives + spec
   status; surface blocking design questions. *(D1 diverges.)*
2. **spec** → ${CLAUDE_SKILL_DIR}/references/spec.md — settle the contract: author/revise the colocated
   `<el>.spec.md`, then the **REVIEW gate** — surface it, await markers/approval, apply
   resolutions. *(D1 converges · human gate.)*
3. **implementation** → ${CLAUDE_SKILL_DIR}/references/implementation.md — build code to match the settled spec;
   version bumps + changelog; an optional mid-build review-pause fires only if the intent
   asks for one. *(D2 diverges.)*
4. **validation** → ${CLAUDE_SKILL_DIR}/references/validation.md — confirm against the spec's API matrix via
   generate-and-drop: colocated source → generate → `?view=validation` → Playwright → drop.
   *(D2 converges.)*
5. **audit** → ${CLAUDE_SKILL_DIR}/references/audit.md — feature↔intent review. **Loop-back gate**: on doubt,
   reopen a diamond (→ spec reopens D1, → implementation reopens D2). Merges nothing; writes
   no history of its own.
6. **close** → ${CLAUDE_SKILL_DIR}/references/close.md — git hygiene on `main` + the **go/no-go merge gate**:
   surface diff + verdict *always*; block for approval when contract-touching OR
   intent-requested; on go, merge `--no-ff` keeping the anchors on `main`, clean up. The only merge.
7. **context** → ${CLAUDE_SKILL_DIR}/references/context.md — governance drift, run with `main` parked, fully
   deferrable. Apply inline by default → a normal context commit; defer only when genuinely large
   → a lightweight `context-rec` note; reject → dropped. Deferrals are the rare exception that
   grows the `context-rec` queue triage drains.
8. **evals** → ${CLAUDE_SKILL_DIR}/references/evals.md — a thin per-ticket retro into `_spec-feedback.md`, feeding
   the inter-ticket promotion loop. Heavy analytics stay out of the per-ticket path.

## audit vs close — never blur the tail gates

- **audit = loop-back.** Judges feature vs. intent. On doubt, confirm or reopen a diamond.
  It does not merge; it records nothing.
- **close = go/no-go on truth.** Surfaces the diff + verdict every time; blocks only when
  contract-touching or intent-requested; on go, it is where the merge to `main` happens.
