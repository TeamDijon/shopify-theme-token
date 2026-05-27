---
paths:
  - "**/*.liquid"
---

# Object construction in Liquid

Liquid has no native object type. The `default` filter applied to `null` creates an object with named properties.

## Pattern

```liquid
{% assign entry = null | default: id: 'abc', status: 'active', label: 'Hello', position: 3 %}
{{ entry.status }}   → "active"
{{ entry.label }}    → "Hello"
```

## What it enables

Named property access enables `where`, `find`, and `sort` filters on arrays of objects. Without this pattern, structured data falls back to delimited strings (fragile, positional indexing) or parallel arrays (must stay synchronized, no filter support).

## Combining with other patterns

Objects built this way can be assembled into arrays using the array building pattern (`uniq | concat`), then filtered with `where`, looked up with `find`, and sorted with `sort` — all by named property.

## When to use

When you need to associate multiple properties with a single entity and later filter, sort, or look up by property name. Typical use cases include building data pipelines, grouping logic, or any scenario requiring structured data beyond simple strings.

## Related

- Array building: `.context/rules/liquid-array-building.md`
