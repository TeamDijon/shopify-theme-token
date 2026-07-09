# Spec — Diamond 1 converges (REVIEW gate)

Settle the contract. Author or revise the colocated spec, then hold the human REVIEW gate at
convergence before the loop proceeds to build. This step owns the *contract only* — no code
changes happen here; making code match the settled contract is `implementation`'s job.

## Where the spec lives

- **Colocated beside the logic owner**, on `main`'s history — authored on the `loop/<slug>`
  feature branch, merged at `close`. For a block+snippet pair the snippet owns the logic, so the
  spec sits at `snippets/<el>.spec.md` and **pins both** `snippets/<el>.liquid` and
  `blocks/<el>.liquid` versions. Block-only elements → `blocks/<el>.spec.md`.
- Discover sibling specs for calibration by glob (`**/*.spec.md`) — the inventory is the colocated
  specs, not a maintained index.

## Author (or revise)

1. Read the template `.context/specs/_template.md`.
2. Read 2–3 sibling specs at the same layer + type for calibration (glob). Prefer recently
   reviewed shipped specs of the matching type.
3. Read `spec-convention.md` (header fields, ordering, style) + `reference-voice.md` (declarative
   voice, no journey residue).
4. Read supporting context for the domain: metaobject specs → `metaobject-definitions.md` +
   `design-system-metaobjects.md`; utility snippets → `asset-loading.md`; block/section → the
   shipped implementation file (cross-check API); JS → `js-asset-convention.md`.
5. Draft every template section. `N/A` with a one-clause reason where a section doesn't apply.
6. Header discipline: `Reviewed: pending` always present; `Reconciled: <date>` iff
   `Status: shipped`; `Implementation: pending` for first build, or pinned `file vX.Y.Z` pairs
   (both files, for pairs) for a retrofit.

If triage produced several specs, authoring the next proceeds while this one awaits review.

## The REVIEW gate — D1 convergence (human)

Surface the drafted spec; await the developer's inline `<!-- REVIEW: -->` markers or approval.
Markers carry an intent prefix that sets the response shape:

| Prefix | Marker shape | Expected response |
|---|---|---|
| `Question` | Open analysis ask | Propose a direction; spec changes likely |
| `Check` | Pointed verification of a claim | Confirm or push back; may or may not change the spec |
| `Spec` | Direct edit instruction | Apply; push back only if the direction is wrong |
| `Chat` | Ask for the developer's understanding | Explain; no spec changes expected |

Inline modulators fine-tune scope (`Question - Briefly, …`; `Spec - Apply directly, …`). A marker
with no prefix defaults to `Question`. Surface any friction you noticed beyond the markers (voice
drift, missing Behavior bullets, cross-spec matches) in a separate labelled section the developer
accepts or dismisses per item; a dismissed observation that signals scope creep is captured as
`evals` friction.

To close the gate: verify zero unresolved markers (`grep -n 'REVIEW:' <spec>`), apply every
settled resolution to the spec body, and bump `Reviewed: pending` → today's date. Gate weight
scales to scope — a typo's spec change clears on a glance; a new primitive's contract earns a
real read.

## Done state

- Spec colocated at the logic owner's path; every required header field + relevant section filled.
- Zero REVIEW markers; `Reviewed: <date>`; body reflects every settled resolution.
- `Implementation` pin: `pending` (first build) or pinned pairs (retrofit); `Reconciled` set iff
  shipped. Spec committed on the `loop/<slug>` branch.
