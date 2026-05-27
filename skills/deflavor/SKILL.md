---
name: deflavor
description: Rewrite a reference document in declarative voice by removing "flavored" language — discussion residue, motivational framing, journey/correction phrasing, rhetorical-question instructions, defensive rebuttals, and conversational asides — while preserving substance and examples. Use when the user asks to "de-flavor", "make this a settled reference", "less flavored", "strip the discussion tone", or "make it declarative". For reference material (conventions, specs, architecture, rules) — not changelogs, tutorials, or onboarding, which legitimately carry voice.
tools: Read, Grep, Glob, Edit
---

# Deflavor

Turn a reference document into settled, declarative prose. A reference states **what is**; flavor records **how it was arrived at** or **argues for it**.

## Scope check

Run only on reference material — conventions, specs, architecture, rules, API docs. Changelogs, tutorials, onboarding, and persuasive writing carry voice by design; if the target is one of those, say so and stop.

## Flavor categories

| Category | Tell | Fix |
|---|---|---|
| Motivational framing | justifies the doc's existence — "prevents the common failure mode", "makes them work" | delete; let the content stand |
| Journey / correction residue | "more precisely", "actually", "not a workaround", "turns out" | state the final position directly |
| Rhetorical question as instruction | "the test: am I duplicating logic?" | convert to a declarative rule |
| Defensive rebuttal | "not the X a section happens to use" — pre-empts a confusion the reader never had | state the positive rule only |
| Editorializing | "the most common mistake is…", "it's worth noting" | cut the meta-commentary, keep the fact |
| Conversational hedging / asides | "of course", "you might think", second-person narration | remove |

## Keep (not flavor)

- The facts, rules, and examples.
- One-clause rationale that guides application: `X, so Y` where Y tells the reader when or how to use it. A clause that aids use stays; a sentence that narrates the debate or reassures goes.

## Workflow

1. **Resolve the target** — the file path from the argument; otherwise the document in current context or IDE selection.
2. **Scope check** — confirm it's reference material. If not, report and stop.
3. **Scan** for the six categories. Read the whole file; flavor hides in intros, section openers, and closing "why this matters" lines.
4. **Present findings before editing** — a `before → after` table per flagged passage, grouped by category. Flag any clause that may be load-bearing rationale for the user to rule on.
5. **Apply on approval** — Edit each passage. Preserve substance, examples, headings, structure. Change voice only; don't reorder or drop information.
6. **Report** — categories addressed and net line delta.

## Notes

- Voice only. If a passage is wrong or missing information, flag it separately — accuracy is not this skill's job.
- When unsure whether a "why" clause is flavor or load-bearing, keep it and flag it. Bias toward preserving meaning.
