---
paths:
  - "**/*.liquid"
---

# Array building in Liquid

Liquid arrays are immutable after creation. The `uniq` filter on a single value creates a one-element array, and `concat` merges arrays. This combination allows incremental array construction.

## Pattern

```liquid
{% assign list = null %}
{% for item in source %}
  {% if list == null %}
    {% assign list = item | uniq %}
  {% else %}
    {% assign list = item | uniq | concat: list %}
  {% endif %}
{% endfor %}
{% assign list = list | reverse %}
```

## Key details

- `uniq` on a non-array value wraps it into a single-element array
- `concat` prepends the new element (not appends), so `reverse` at the end corrects the order
- Works with objects created via `null | default:`, not just primitives
- The `null` check on the first iteration avoids concatenating with a non-array

## When to use

When building a collection of items incrementally inside a loop, especially when the items are objects with named properties that need to be filtered or sorted later.

## Related

- Object construction: `.context/rules/liquid-object-construction.md`
