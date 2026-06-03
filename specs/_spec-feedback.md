# Spec-system feedback

Improvement log for the spec template, conventions, and reference voice. Captures per-phase friction the implementer / reviewer / authoring agent encountered against the spec contract, so the spec system can evolve from real shipping signal instead of speculation.

Read at the start of an authoring or review pass when a refresh on recent frictions would help. Appended to whenever a pipeline phase surfaces friction worth recording.

## When to append

Append a row to the **Log** table when a pipeline phase (authoring, review, implementation, validation, audit) surfaces friction the spec system didn't already absorb. Skip when the phase was friction-free — empty rows are noise.

The implementation skill's checklist names this explicitly; other skills should follow the same discipline as they mature.

## Pass enum

| Value | Source skill (pipeline phase) | Typical friction shape |
|---|---|---|
| `author` | spec-author (phase 2) | Template gap (no section/field fits the spec's nature); convention ambiguity surfaced while filling the template |
| `review` | spec-review (phase 3) | Voice drift the reviewer noticed; section ordering that read poorly; cross-reference gaps; convention bullets the spec couldn't apply cleanly |
| `impl-first` | implementation (phase 4, first build) | API ambiguity, edge-case behavior not covered, decision punted to implementer |
| `impl-update` | implementation (phase 4, subsequent build) | Drift between amended spec and prior implementation; spec change unclear on backwards-compat surface |
| `validation` | validation (phase 5) | Validation matrix doesn't translate cleanly into a buildable page; tier sub-shape mismatch; missing assertion vocabulary |
| `audit` | audit (phase 6) | Cross-spec pattern — the only phase scanning multiple specs at once, so its findings tend to be promotion-ready |

Triage (phase 1) doesn't interact with spec content and doesn't write to this log.

## Slug format for candidates

Each `Candidates` cell entry follows `<target>:<short-kebab-description>`:

| Prefix | Target file |
|---|---|
| `template:` | `_template.md` |
| `convention:` | `spec-convention.md` |
| `voice:` | `reference-voice.md` |
| `arch:` | `architecture.md` / `knowledge-architecture.md` / other orientation docs |

Multiple candidates in one row: semicolon-separated.

## Promotion mechanism — manual + periodic

Promotion (a candidate lifts into a real template / convention / voice-rule edit) and demotion (a former rule retires) are **never automatic**. The 2+-occurrence rule used elsewhere in this knowledge layer does not apply here — frequent template churn would force retrofitting across the existing spec corpus, which is expensive.

Periodic review is developer-prompted. Natural moments:

- End of a multi-spec unit of work (e.g., finishing the L0 snippet wave)
- Before invoking a planned audit phase
- When the Promotion candidates section feels crowded enough to act on

During review, candidates get judged on signal strength: recurrence count, fit with existing template structure, whether retrofit cost across shipped specs is justified by the clarity gain. A promotion or demotion lands as its own commit on `context`, with the moved row migrated from Promotion candidates to the matching archived section.

## Log

| Date | Spec | Pass | Commit | Worked | Friction | Tightening | Candidates |
|---|---|---|---|---|---|---|---|
| 2026-06-02 | hydrate v1.0.0 | impl-first | `ce72dc0` | API table unambiguous on defaults + types; validation matrix pinned the IO-constructor arg shape; consumer usage example calibrated real-code shape; "no global registration" line settled the core.js question (with a charitable read) | callback-throw ordering not covered (disconnect-first inferred for safety on the error path); core.js / window.Token re-export decision implied not stated | Implementation-time decisions vs Out of scope overlap (cancellation API + idle variant + interaction variant appear in both); two Behavior bullets describe `IntersectionObserver` platform behavior more than utility contract | `template:throw-path-bullet`; `convention:no-window-token-explicit`; `template:itd-vs-oos-split` |
| 2026-06-02 | dom v2.0.0 | review | `0762eab` | Behavior bullets cover edge cases (lazy on read, null + warn, no creation/mutation) cleanly; cross-refs to `CacheManager` + `base-component` well-placed | Design principle ("stable unique ID per well-known central element") implicit — stated piecewise across Purpose / API table / Out-of-scope rather than led with; reviewer had to surface it via marker | Purpose ¶2 + Behavior bullet "Trim policy" + Future-property-table coda all carried version-history journey residue ("Earlier versions exposed…", "v2.0.0 trim removed 6") — same pattern as events-manager review (marker 3 voice tightening, same day) | `voice:version-history-belongs-in-changelog`; `template:design-principle-upfront-purpose` |

## Promotion candidates

Running list, hand-maintained at periodic review time. Deduplicated across log entries — when a candidate slug recurs, bump Recurrence and Last seen rather than adding a new row.

| Candidate | Recurrence | First / last seen | Target file | Proposed edit |
|---|---|---|---|---|
| `template:throw-path-bullet` | 1 | 2026-06-02 / 2026-06-02 | `_template.md` Behavior guidance | Add guidance for the "error-path contract" — when the spec describes a callback the consumer passes in, name what happens when that callback throws and what the utility guarantees on the error path (e.g., fire-once must still hold; cleanup must still run). |
| `convention:no-window-token-explicit` | 1 | 2026-06-02 / 2026-06-02 | `spec-convention.md` Type-specific variants (utility-js row) | Utility-js specs should explicitly state in Out of scope whether the export is re-exported via `core.js` / `window.Token` — don't leave it to inference from "opt-in per consumer" framing. Two valid placements (re-exported alongside utils, ESM-only) should be a deliberate authoring choice. |
| `template:itd-vs-oos-split` | 1 | 2026-06-02 / 2026-06-02 | `_template.md` Implementation-time decisions + Out of scope | Add a one-line authoring rule of thumb for the split: Implementation-time decisions = deferred-but-plausible (likely v1.1 or later if a consumer asks); Out of scope = rejected for v1 (won't add without re-scoping the element). When the same item is both, prefer Out of scope and drop the ITD bullet to avoid the dual-listing drift. |
| `voice:version-history-belongs-in-changelog` | 2 | 2026-06-02 / 2026-06-02 | `reference-voice.md` Journey/correction residue rule | Add an explicit bullet that version-history references ("Per v2.0.0…", "Earlier versions exposed…", "Was trimmed in vX…") belong in the changelog comment / git log, not the spec body — the spec describes the current contract forward-looking. Current journey-residue examples cover correction phrasing ("more precisely", "actually") but don't unambiguously cover historical references. Surfaced twice on 2026-06-02: events-manager marker 3 voice tightening ("Per the v2.0.0 changelog" preamble) and dom.md review (Purpose ¶2 + Behavior "Trim policy" + Future-property coda — three sites in one spec). |
| `template:design-principle-upfront-purpose` | 1 | 2026-06-02 / 2026-06-02 | `_template.md` Purpose-section guidance | When the element has a distinctive design principle (e.g., dom.md's "stable unique ID per central element", hydrate's "fire-once + disconnect-on-visible"), Purpose ¶1 should lead with it rather than letting it surface implicitly across Purpose / API / Behavior / Out-of-scope. Reader assembles the contract from the lead sentence instead of by induction. |

## Archived (promoted)

Candidates lifted into real edits. Preserves the trail so a future reviewer can trace why a template / convention bullet exists.

| Landed | Candidate | Target file | Commit |
|---|---|---|---|

## Archived (demoted)

Template / convention / voice-rule bullets retired with reason. Rare — most edits accrete rather than retract.

| Retired | Pattern | Reason | Commit |
|---|---|---|---|

## Periodic review notes

Dated entries from the developer's review passes. One row per review pass, even when no promotions or demotions land.

| Date | Promoted | Demoted | Note |
|---|---|---|---|
