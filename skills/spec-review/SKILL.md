---
name: spec-review
description: Close a spec review cycle — apply the resolutions discussed for inline `<!-- REVIEW: -->` markers, bump `Reviewed: pending` → today's date, propagate any code-side renames or behavioral changes the review settled, run theme-check, stage commits separately by branch (context for spec + main for code), audit adjacent docs for drift introduced. Invoke when all REVIEW markers on a spec have reached resolution through discussion with the developer. Pipeline phase 3 of 6.
status: draft (refine after first use)
---

# Spec review

Close a spec review cycle. The developer placed `<!-- REVIEW: ... -->` markers on the spec and the marker discussions have all reached resolution. This phase applies the resolutions, propagates any code-side changes the review triggered, dates the `Reviewed` field, and audits adjacent docs for drift.

## Trigger

All inline REVIEW markers on a spec have been discussed and reached resolution (either applied or explicitly deferred with a follow-up captured elsewhere).

## Inputs

- The spec file with REVIEW markers
- The resolution per marker (from the discussion thread)
- Any code-side propagation the review settled (renames, version bumps, behavioral changes)

## Checklist

1. **Verify zero unresolved markers remain:** `grep -n 'REVIEW:' <spec-file>`. If any unresolved markers exist, surface them; do not proceed.
2. **Apply settled marker resolutions** to the spec body:
   - Wording rewrites
   - Behavior table corrections
   - New Out-of-scope bullets capturing deferred work
   - Cross-reference additions in Related
3. **Bump `Reviewed`:** `pending` → today's date (`YYYY-MM-DD`).
4. **Enumerate code-side propagations** triggered by settled markers. Examples:
   - Implementation-file edits (behavior change, version bump)
   - Renames across consumers (`window.foo` → `window.Bar`, class names, modifier values)
   - Locale-key additions / renames
   - Cross-spec pin updates if the implementation file's version bumped
5. **Apply each code-side propagation:**
   - Edit the source file(s)
   - Bump implementation versions with changelog entries per affected file
   - Update the spec's `Implementation` pin if the file version moved
   - Update `Reconciled` with a brief note explaining the bump's relation to the review
6. **Run `theme-check`** + light visual smoke (Playwright on the affected surface) if the changes touched anything renderable.
7. **Stage commits separately by branch:**
   - Context branch: spec edits + any `.context/docs/` drift fixes
   - Main branch: code propagations
   - One commit per logical unit; commit messages name the spec + the review's settled changes
8. **Audit related docs for drift introduced by the review:**
   - `grep -rn '<changed-symbol>' .context/` — verify cross-references stay accurate
   - Sibling specs that pin the same implementation file: check their pin versions
   - Rules / convention docs that document patterns the review changed: update if drifted
9. **Verify final state:** the spec has no markers, has a dated `Reviewed`, and all pinned versions reflect post-review state.

## Done state

- Spec: zero markers; `Reviewed: <date>`; body reflects every settled resolution
- Code: all propagations applied; theme-check clean
- Commits: staged in the correct branches with descriptive messages
- Adjacent docs: audited for drift; fixed or flagged

## Handoff

If the spec describes an implementation that doesn't yet exist (or has drifted significantly), the **implementation** phase follows. If the spec already matches its implementation and only doc-level changes occurred, the next phase may be **audit** instead — depends on whether the review prompted code work.
