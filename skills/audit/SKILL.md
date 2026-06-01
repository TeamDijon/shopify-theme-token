---
name: audit
description: Scan supporting docs / rules / sibling specs for drift introduced during a recent shipping cycle. Greps cross-references to changed symbols, verifies pin versions on sibling specs, checks rules for pattern drift, updates `specs-index.md` status entries, flags changelog discipline gaps, identifies cycle-introduced patterns that earn a new doc. Output: drift fixes committed on context or flagged for follow-up. Invoke at the end of an implementation + validation cycle before declaring the unit of work done. Pipeline phase 6 of 6.
status: draft (refine after first use)
---

# Audit

Close the loop on a shipped element by scanning supporting docs, rules, and sibling specs for drift introduced during the cycle. Catch the references / patterns / examples that lag the new state before they compound.

## Trigger

An implementation + validation cycle has completed. Before declaring the ticket / unit of work done, run an audit pass.

## Inputs

- The spec(s) touched during the cycle
- The implementation file(s) shipped
- The validation page(s) built
- Supporting docs (`.context/docs/`) and rules (`.context/rules/`) that document patterns the element relies on

## Checklist

1. **Inventory the symbols / paths / handles that moved during the cycle.** Quick mechanical pass: `git log --oneline <cycle-start>..HEAD` on both branches surfaces the touched files; `git diff <cycle-start>..HEAD -- '<file>'` shows the changed lines. Categorize what's surfaced:
   - New CSS variable names emitted (`--color-role-foreground-muted`)
   - New / renamed modifiers (`text-style:<handle>`)
   - New / renamed class names (`TokenCart`)
   - New / renamed JS exports (`hydrateOnVisible`)
   - New / renamed selectors (`[data-modifiers*='excerpt-clamp']`)
2. **Grep across `.context/` for each symbol/path.** For each finding outside the element's own spec:
   - Is the reference accurate?
   - Is the cited version up to date?
   - Does the description match current behavior?
3. **Check sibling specs** that pin the same implementation file:
   - Pin version matches current file version?
   - Reconciled date stale relative to the file's last touch?
   - Consumer list correct?
   - `Whitelisted by` (L1 blocks) accurate?
4. **Check rules under `.context/rules/`** for patterns the cycle touched:
   - If a convention rule documented the old pattern, does it document the new pattern now?
   - New patterns introduced by the cycle — earn a rule entry or stay element-local?
5. **Check `specs-index.md`:**
   - Entry status reflects current state (`planned` → `shipped — retrofit` if first build happened)
   - One-line description still accurate
6. **Check metaobject-definitions / design-system-metaobjects** if the cycle touched a metaobject:
   - Runtime notes match emission behavior
   - Cross-references to the metaobject's spec accurate
7. **Check changelog discipline** on the implementation file:
   - Every contract-touching change has a changelog entry
   - No "internal-only refactor" lines for changes that did touch contract
8. **Identify any cycle-introduced patterns** that earn a new doc:
   - 2+ specs reference a pattern not documented elsewhere → candidate for a new doc in `.context/docs/`
9. **Apply drift fixes as a separate commit on context** — one commit message summarizing what drifted and was reconciled. If drift is too broad to fix safely in one pass, flag it as a follow-up note (in `BACKLOG.md` if it exists; otherwise as a chat surface).
10. **Run `theme-check`** as a final clean-state assertion.

## Done state

- Every cycle-introduced symbol audited for cross-reference accuracy
- Sibling specs verified clean (pin + reconciled + consumer fields)
- Rules / convention docs updated where patterns moved
- specs-index up to date
- Metaobject docs cross-referenced correctly (if applicable)
- Changelog discipline verified
- Drift fixes committed; remaining drift flagged
- theme-check: zero offenses

## Handoff

The cycle is closed. The ticket / unit of work can be merged + presented for merchant review (if applicable). The next cycle starts with **triage** of the next business need.
