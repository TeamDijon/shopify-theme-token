---
name: validation
description: Build the validation page named in a spec's `Validation` section — `sections/validation--<tier>--<name>.liquid` + matching template — exercising the API matrix the spec describes, building the visual showcase per the spec's intent, verifying each assertion (prose now, Playwright when installed). Per `validation-contract.md` tier sub-shapes. Invoke when an element is shipped and its `Validation` section names a page that doesn't exist yet. Pipeline phase 5 of 6.
status: draft (refine after first use)
---

# Validation

Build the validation page described by the spec's `Validation` section. The page exercises the element's API matrix end-to-end and provides the visual showcase a reader (developer or agent) walks to confirm the spec is honored.

## Trigger

An element is shipped (implementation matches the spec) and the spec's `Validation` section names a page that doesn't exist yet (or exists but needs updates after recent spec amendments).

## Inputs

- The spec's `Validation` section: Tier, page filename, API surface matrix, edge cases, visual showcase intent, assertions
- The shipped implementation file(s)
- `validation-contract.md` for tier-specific page conventions
- `validation.md` for the validation-suite shape (sr-only chrome, breadcrumb, etc.)

## Checklist

1. **Re-read the spec's `Validation` section.** Note: the tier sub-shape (1a metaobject / 1b utility-snippet / 1c utility-css / 1d utility-js / 2 theme-primitive / 3 preset / 4 specialized section), the page filename, the matrix to exercise.
2. **Locate / create the section file** `sections/validation--<tier>--<name>.liquid`. Follow `validation.md` for the file shape:
   - Version header + changelog
   - Liquid block with intro chrome (breadcrumb back to hub, intro paragraph)
   - Per-row markup exercising one matrix cell
   - Schema with `"name"` (Shopify 25-char limit) + `"class": "shopify-section--validation--..."`
3. **Locate / create the template** `templates/index.validation--<tier>--<name>.json` referencing the section.
4. **Build per the matrix** the spec describes:
   - One visual row per matrix cell (state × variant × edge case)
   - Each row labels its state in monospace metadata above the visual
   - Edge cases get their own clearly-labeled rows
5. **Implement the "Visual showcase"** the spec describes: layout choices, swatches, comparison rows, viewport-switching demonstrations.
6. **Run the page locally** via the dev server. Cycle through every row visually. Confirm each matches the spec's prose expectation.
7. **Run Playwright smoke** if any aspect needs computed-style or DOM-state verification beyond what's eyeballable:
   - Take screenshots at relevant viewports (file under `.playwright-mcp/`)
   - Use `browser_evaluate` for computed-style queries when the spec asserts specific values
8. **Verify each assertion** from the spec's `Assertions` list. For prose-only assertions today: confirm by inspection. For prose-marked "Playwright once installed": document the verification path now; the Playwright spec lands when test infrastructure ships.
9. **Run `theme-check`** — zero offenses.
10. **Stage commit on main branch** — section file + template file.
11. **Update the spec's `Validation` section** if anything changed during the build (page filename refinements, matrix additions). Stage that on context as a small reconciled-amendment commit.

## Done state

- Validation page exists at the spec-named path with the matching template
- Every matrix cell from the spec is exercised on the page
- Every edge case has its own visibly-labeled row
- Visual showcase matches the spec's intent
- Theme-check clean
- Assertions verified (prose-confirmed today; Playwright-ready)
- Commits staged on main (+ context if the spec's Validation section needed amendment)

## Handoff

The element has shipped + been validated. The **audit** phase reviews supporting docs / rules / cross-references for drift before the cycle closes.
