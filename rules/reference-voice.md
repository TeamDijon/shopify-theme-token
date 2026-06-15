---
paths:
  - ".context/docs/**/*.md"
  - ".context/rules/**/*.md"
  - ".context/specs/**/*.md"
---

# Reference voice

Reference docs (conventions, specs, architecture, rules) state **what is** — not how it was decided or why it matters. Write declaratively.

Avoid:
- **Motivational framing** — "prevents the common failure mode", "makes X work"
- **Journey / correction residue** — "more precisely", "actually", "not a workaround"
- **Transient-artifact references** — version history ("Per v2.0.0…", "Was renamed in v1.3.0", "Earlier versions exposed…") and working-queue artifacts ("BACKLOG-noted X", "from BACKLOG Bucket C", "TODO: revisit"). Both shapes reference transient artifacts outside the spec's contract. Version history lives in the changelog comment / git log; the body describes the current contract. Deferred features have their canonical home in Out of scope — the body names the deferred feature as a non-feature, not as a pending queue position. Implementation pin headers and Related-section cross-spec convergence references (e.g., "same v2.0.0 evolution pattern as modifiers-manager") are the only sanctioned places version literals appear.
- **Rhetorical questions as rules** — write the rule as a statement
- **Defensive rebuttals** — "not the X you'd assume"; state the positive rule only
- **Editorializing** — "the most common mistake is…", "it's worth noting"
- **Conversational asides** — "of course", "you might think", second person

Keep facts, examples, and one-clause rationale that guides use (`X, so Y` where Y tells the reader when/how to apply it).

Remediate an existing doc with the `/deflavor` skill.
