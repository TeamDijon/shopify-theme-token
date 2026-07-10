# utility--speculation-rules

**Layer**: substrate

**Type**: utility-snippet (`snippets/utility--speculation-rules.liquid`)

**Status**: shipped

**Implementation**: `snippets/utility--speculation-rules.liquid` v1.0.0 (head-script emitter)

**Reconciled**: 2026-06-05

**Reviewed**: 2026-06-05

**Depends on**: none — emits a static `<script type="speculationrules">` block

**Consumers**: `layout/theme.liquid` + `layout/landing.liquid` — head spine stage 11

## Purpose

Emits a `<script type="speculationrules">` block that tells supporting browsers to prefetch likely-next same-origin documents on hover / pointerdown (`eagerness: moderate`). Prefetch (not prerender) avoids premature JS execution on commerce-sensitive pages — prerender would fire pixels, mutate cart, and warm analytics on visits the user never confirms.

Cart, checkout, and account routes are explicitly excluded — these change state on visit (cart contents, session, account scope) and a prefetched copy would race against the user's real navigation. Any link explicitly marked `[data-no-speculate]` is also excluded — opt-out for per-link special cases.

Browsers auto-suppress speculation under Data Saver or metered connections; no manual reduced-data guard is needed.

## API

No params. Emits a static script block — the rule set is fixed.

## Output shape

```html
<script type="speculationrules">
{
  "prefetch": [
    {
      "where": {
        "and": [
          { "href_matches": "/*" },
          { "not": { "href_matches": "/cart*" } },
          { "not": { "href_matches": "/checkout*" } },
          { "not": { "href_matches": "/account*" } },
          { "not": { "selector_matches": "[data-no-speculate]" } }
        ]
      },
      "eagerness": "moderate"
    }
  ]
}
</script>
```

## CSS

N/A.

## CSS custom properties (exposed)

N/A.

## Behavior

- **Prefetch, not prerender.** Prefetch warms the document fetch (HTML + linked assets via subresource hints). Prerender runs the page in a hidden tab — JS executes, analytics + Web-Pixels fire, custom elements mount. On commerce, this would inflate Pageviews, fire add-to-cart pixels on cart-page prerenders, and double-mount components. Prefetch avoids all that.
- **`eagerness: moderate`.** Triggers on hover or pointerdown for links, not on viewport entry. Less aggressive than `eager` (immediate on link visibility) and more aggressive than `conservative` (only on pointerdown).
- **Same-origin scope.** `href_matches: "/*"` matches every relative-path link on the page. Cross-origin links don't match; speculation rules wouldn't fire for them anyway under most browsers' security defaults.
- **Three explicit route exclusions.** `/cart*`, `/checkout*`, `/account*`. State-mutating or session-scoped pages that shouldn't be prefetched.
- **Opt-out via `[data-no-speculate]`.** Per-link escape hatch — add the attribute to any anchor element that should not be prefetched. The `selector_matches` predicate runs against the anchor element directly.
- **Browser-managed Data Saver / metered suppression.** The Speculation Rules spec defines browser-managed suppression under reduced-data signals. No utility-side flag.
- **Static — no Liquid logic.** The script block is a literal — no per-page branching, no per-template variation. Adding route exclusions or per-template rules would land here as edits.

## A11y

N/A — speculation rules affect navigation timing, not page content or screen-reader output.

## Locale keys

N/A — pure JSON config, no user-facing strings.

## Validation

Per `validation-contract.md` Tier 1b (substrate / utility-snippet).

- **Tier**: substrate — utility-snippet sub-shape
- **Page(s)**: every page; validation via Chrome DevTools Application → Speculation Rules panel
- **API surface** (matrix to exercise):
  - Hover an internal link → Network panel shows a prefetch entry within a beat
  - Hover a `/cart*` / `/checkout*` / `/account*` link → no prefetch
  - Hover a link with `[data-no-speculate]` → no prefetch
  - Hover a cross-origin link → no prefetch (same-origin restriction)
  - Mobile preview under Chrome's Data Saver / Lite mode → speculation suppressed
- **Edge cases**:
  - Link with `href` matching one of the exclusions but also `[data-no-speculate]` — both predicates exclude; redundant defense
  - Link to a checkout-adjacent route not under `/checkout*` (e.g. `/products/<handle>` for a digital good) — speculated normally; out of scope (checkout-adjacent state is determined by the destination, not the link path)
- **Visual showcase**: DevTools Speculation Rules panel + Network panel showing the prefetched documents
- **Assertions** (prose; Playwright once installed): on hover of an eligible link, the prefetched response is in cache; on cart / checkout / account links, no prefetch entry appears
- **Unit scope**: none

## Implementation-time decisions

Shipped — no open decisions.

## Out of scope

- **Per-template rule tuning.** All pages emit the same rule set. Per-template variation (e.g. tighter rules on product pages, looser on collection pages) requires Liquid branching inside the utility — none currently warranted.
- **Prerender opt-in for specific routes.** Prerender (eager execution) is universally avoided. Prerendering safe destinations (e.g. about / contact pages) would be a separate rule set; out of scope.
- **Eagerness override per-link.** All matched links use `eagerness: moderate`. Per-link `[data-eagerness="immediate"]` would require a second rule. Out of scope.
- **Origin-relative external resources.** Cross-origin speculation requires a separate rule shape (`requires: ["anonymous-client-ip-when-cross-origin"]`). Out of scope; no current cross-origin destinations.
- **Document caching coordination.** The browser handles prefetch cache lifetime; the utility makes no assertions about TTL.

## Related

- `layout.spec.md` — head spine stage 11 consumer
