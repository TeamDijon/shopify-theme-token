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
| 2026-06-02 | modifiers-manager v2.0.0 | review | `63ac8c8` | API table comprehensive (constructor + 6 methods documented with params/returns/behavior); cross-references with `modifier-system.md` (JS hooks paragraph + Swapping-a-key's-value rule) interlock cleanly with no drift; Behavior bullets describe semantic invariants ("one value per key") precisely | "No event emission" bullet hedged "uncommon" without naming the underlying reason (mutating component owns the reaction; no listener roundtrip needed) — required marker round-trip to surface; forward-looking upsert deferral lived in a Behavior bullet where readers parse it as current-state availability rather than as a deferred-not-provided note | Out-of-scope missed a design-boundary bullet ("doesn't follow Set/Map/classList overwrite-on-add convention") that earns its keep — the gotcha is documented in Behavior but not surfaced as a deliberate non-feature in OOS; Atomic value swap bullet carried v2.0.0 history ("v2.0.0 explicitly dropped setValue…") — same pattern as events-manager + dom.md | `voice:version-history-belongs-in-changelog`; `template:itd-vs-oos-split` (broader scope — see updated description) |

## Promotion candidates

Running list, hand-maintained at periodic review time. Deduplicated across log entries — when a candidate slug recurs, bump Recurrence and Last seen rather than adding a new row.

| Candidate | Recurrence | First / last seen | Target file | Proposed edit |
|---|---|---|---|---|
| `template:throw-path-bullet` | 1 | 2026-06-02 / 2026-06-02 | `_template.md` Behavior guidance | Add guidance for the "error-path contract" — when the spec describes a callback the consumer passes in, name what happens when that callback throws and what the utility guarantees on the error path (e.g., fire-once must still hold; cleanup must still run). |
| `convention:no-window-token-explicit` | 1 | 2026-06-02 / 2026-06-02 | `spec-convention.md` Type-specific variants (utility-js row) | Utility-js specs should explicitly state in Out of scope whether the export is re-exported via `core.js` / `window.Token` — don't leave it to inference from "opt-in per consumer" framing. Two valid placements (re-exported alongside utils, ESM-only) should be a deliberate authoring choice. |
| `template:itd-vs-oos-split` | 2 | 2026-06-02 / 2026-06-02 | `_template.md` Behavior + Implementation-time decisions + Out of scope guidance | **Broader framing surfaced 2026-06-02 modifiers-manager review:** Out of scope is the canonical home for what the element does NOT do — absent methods, deliberate non-features, design boundaries against common API intuitions, forward-looking "if needed, additive path X" deferrals. Behavior describes current state only; Implementation-time decisions describes choices made *during* the build, not deferrals. When a non-feature or deferral candidate appears in another section, OOS is the destination. Recurrences: hydrate (ITD + OOS bullets dual-listed cancellation/idle/interaction variants); modifiers-manager (forward-looking upsert deferral in Behavior bullet; missing OOS bullet on "doesn't mirror Set/Map/classList overwrite-on-add" design boundary). |
| `voice:version-history-belongs-in-changelog` | 3 | 2026-06-02 / 2026-06-02 | `reference-voice.md` Journey/correction residue rule | Add an explicit bullet that version-history references ("Per v2.0.0…", "Earlier versions exposed…", "Was trimmed in vX…") belong in the changelog comment / git log, not the spec body — the spec describes the current contract forward-looking. Current journey-residue examples cover correction phrasing ("more precisely", "actually") but don't unambiguously cover historical references. Surfaced 3× on 2026-06-02 — events-manager marker 3 ("Per the v2.0.0 changelog" preamble); dom.md (Purpose ¶2 + Behavior "Trim policy" + Future-property coda — three sites in one spec); modifiers-manager (Atomic value swap bullet "v2.0.0 explicitly dropped setValue…"). Three consecutive specs in one review batch — strong promotion signal. |
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
