---
paths:
  - ".context/docs/**/*.md"
  - ".context/rules/**/*.md"
---

# Reference voice

Reference docs (conventions, specs, architecture, rules) state **what is** — not how it was decided or why it matters. Write declaratively.

Avoid:
- **Motivational framing** — "prevents the common failure mode", "makes X work"
- **Journey / correction residue** — "more precisely", "actually", "not a workaround"
- **Rhetorical questions as rules** — write the rule as a statement
- **Defensive rebuttals** — "not the X you'd assume"; state the positive rule only
- **Editorializing** — "the most common mistake is…", "it's worth noting"
- **Conversational asides** — "of course", "you might think", second person

Keep facts, examples, and one-clause rationale that guides use (`X, so Y` where Y tells the reader when/how to apply it).

Remediate an existing doc with the `/deflavor` skill.
