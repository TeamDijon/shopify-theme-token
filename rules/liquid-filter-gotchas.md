---
paths:
  - "**/*.liquid"
---

# Liquid filter gotchas

Filters whose documented behavior diverges from what we observe in this Shopify Liquid runtime. Verified empirically; see references for the supporting test.

## `squish` is a no-op

`{{ '  a   b  ' | squish }}` returns `'  a   b  '` unchanged. Same for newlines (`'a\n\nb' | squish` returns the input). Documented behavior is "remove any whitespace including newlines and replace with a single space" — but the filter does not function in this runtime.

**Use instead** — `strip_newlines | split: ' ' | join: ' '` collapses runs of any whitespace (Liquid's `split: ' '` inherits Ruby's special-case behavior of treating any whitespace as the separator and dropping empty splits). `strip | split: ' ' | join: ' '` produces the identical result, since `split: ' '` already collapses newlines.

**Why it matters** — `utility--css-minifier` v1.1.0 silently regressed when its whitespace pass migrated to `squish`; the bug went unnoticed for the entire v1.1.x–v1.2.x window because the comment-strip and token-collapse passes still produced visible savings on test inputs. Restored to the working chain in v2.0.0.

**Reference** — `sections/test-minifier.liquid` (test fixture; remove once v2.0.0 has soaked).

## When you reach for a filter you "remember works"

Run a 30-second sanity check (`{{ '  a   b  ' | <filter> | prepend: '[' | append: ']' }}`) before relying on it. Filter documentation is not a guarantee in this runtime.
