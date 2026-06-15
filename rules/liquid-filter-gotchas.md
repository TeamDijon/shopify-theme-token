---
paths:
  - "**/*.liquid"
---

# Liquid filter gotchas

Filters whose documented behavior diverges from their actual behavior in this Shopify Liquid runtime. Verified empirically; see references for the supporting test.

## `squish` is a no-op

`{{ '  a   b  ' | squish }}` returns `'  a   b  '` unchanged. Same for newlines (`'a\n\nb' | squish` returns the input). Documented behavior is "remove any whitespace including newlines and replace with a single space" — but the filter does not function in this runtime.

**Use instead** — `strip_newlines | split: ' ' | join: ' '` collapses runs of any whitespace (Liquid's `split: ' '` inherits Ruby's special-case behavior of treating any whitespace as the separator and dropping empty splits). `strip | split: ' ' | join: ' '` produces the identical result, since `split: ' '` already collapses newlines.

Prior regression: `utility--css-minifier` v1.1.0 migrated its whitespace pass to `squish` and silently stopped collapsing; restored to the `split`/`join` chain in v2.0.0.

## Verifying filter behavior

Before relying on a filter, run a 30-second sanity check: `{{ '  a   b  ' | <filter> | prepend: '[' | append: ']' }}`.

## Dates

Liquid has no date arithmetic, and `date` emits English month and day names regardless of locale. See `.context/docs/liquid-dates.md` for the timestamp-math and translation-replacement patterns.
