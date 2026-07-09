# Evals — per-ticket retro (thin)

A lightweight friction capture at the end of the loop, feeding the inter-ticket promotion loop. A
thin capture hook: heavy analytics (log analysis, cost-to-impact signals) run on a separate
periodic cadence, outside the per-ticket path.

## When it writes

Only when the cycle surfaced friction the knowledge layer didn't already absorb. A friction-free
cycle writes nothing — empty rows are noise.

## Capture

1. **Spec-system friction** (template gap, convention ambiguity, API under-specified, a validation
   matrix that didn't translate) → append a row to `.context/specs/_spec-feedback.md` following its
   preamble: the `Pass` value, Worked / Friction / Tightening, and `Candidates` in
   `<target>:<short-kebab>` form. Commit on the context branch.
2. **Loop-mechanics friction** (a step reference that misled, a gate that misfired, routing that
   didn't fit the scope) → capture it as a retro note (chat surface) toward a future `ticket-loop`
   reference / rule edit. `_spec-feedback.md`'s slugs target the spec system, not skills, so a
   loop-mechanics note does not go there.

## Promotion is separate

Promotion of a candidate into a real template / convention / skill edit is **manual and periodic**
(per `_spec-feedback.md`'s promotion mechanism), prompted at the end of a multi-ticket wave. Evals
captures; promotion runs separately.

## Done state

- Friction worth recording captured (spec-system row on context; loop-mechanics note); a
  friction-free cycle leaves no trace.
