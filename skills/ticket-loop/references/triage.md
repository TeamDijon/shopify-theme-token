# Triage — Diamond 1 diverges

Translate a business need into a layered work plan, and open the loop's durable state. Output:
a punch list (specs to author, files to touch, validations to add, design questions to resolve)
plus the two anchor commits that make the intent survive compaction and stay auditable.

## Inputs

- The business need in 1–3 sentences — what the storefront visitor or admin does. If a ticket
  was pasted (or a Linear MCP is connected and the agent fetched one), that is the raw material;
  the prompt anchor below is the durable interface, not Linear.
- The layer model in `.context/docs/composition-strategy.md`.
- The spec inventory — discovered by glob (`**/*.spec.md`) across colocated specs; the inventory
  is the colocated specs themselves, not a maintained index.

## 1. Anchor the intent — open the loop's state substrate

1. Open a feature branch off `main`: `loop/<slug>` (`<slug>` = the element or a short kebab of
   the need).
2. **Prompt anchor** — capture the verbatim request/ticket as an empty commit *before* any
   interpretation, so audit can re-read the untouched intent later:
   `git commit --allow-empty -m "loop-prompt(<slug>): <one-line>" -m "<verbatim request>"`.
3. The **plan anchor** follows once the punch list is settled (step 8). Both anchors are
   provisional — `close` squashes them into the merge.

## 2. Drain the context-rec queue for elements in scope

Conditional surface, not a gate. It fires only when there is an open `context-rec` for an
element this ticket touches; with none, this step is a silent no-op. Discover open recs
(enqueued at the `context` step of past cycles — see `context.md`):

    git -C .context log --grep="context-rec"

An entry is open until a later commit references it with a `Closes-rec: <sha>` trailer. For each
open rec touching an in-scope element, the debt is already approved (it cleared human judgment
when it was enqueued), so the default is to **fold it into this cycle's plan** — no re-decision.
The one escape is **re-defer**: if the rec is bigger than this ticket should absorb, leave it
queued untouched. Recs for out-of-scope elements always stay queued.

## 3. Restate the business need

Restate it in your own words to confirm understanding. Keep it merchant-facing.

## 4. Identify the surface + assign a layer

Name the surface that delivers the need (new section, a preset on `section.liquid`, a
specialized section, an addition to an existing block…). Walk the layer model to assign it to a
layer — substrate / L0 / L1 / L2 / Beyond-L2. Many archetypes are L2 presets, not new sections.

## 5. Enumerate the primitives + their spec status

For each primitive the surface composes, glob for its colocated `<el>.spec.md` and read the
status: shipped (`Status: shipped`), planned (`Status: spec`), or net-new (no spec yet).

## 6. Identify substrate / metaobject dependencies

New metaobject entries to seed? New scheme-role tokens or design constants? New utility snippets
or JS modules?

## 7. Identify implementation work beyond specs

Validation source to author, new locale keys, theme settings, template files.

## 8. Surface blocking design questions, then settle the plan

Surface anything unresolvable from existing docs/specs — settings shape, defaults, v1 vs.
deferred scope. Resolve the blocking ones with the developer *before* spec authoring. Order the
remaining work by dependency (which spec must be authored first because others depend on it).

Then write the **plan anchor** — the settled punch list as an empty commit:
`git commit --allow-empty -m "loop-plan(<slug>): <n> specs, <n> impls" -m "<punch list>"`.

## Done state

- Feature branch open; prompt anchor + plan anchor committed on it.
- Any in-scope `context-rec`s drained into the plan or re-deferred.
- Punch list settled: restated need · layer breakdown · per-spec name+layer+status
  (existing / revise / new) · per-impl file path + nature · validation surfaces · authoring order.
- All blocking design questions resolved with the developer; non-blocking ones recorded in the
  punch list (and the plan-anchor body) for later.
