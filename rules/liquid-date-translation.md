---
paths:
  - "**/*.liquid"
---

# Date translation in Liquid

Liquid's `date` filter always returns English month and day names regardless of the store locale. A string-replacement pattern using translation keys provides locale-aware dates.

## Pattern

```liquid
{% assign formatted = timestamp | date: '%e %B' | strip %}
{% assign month_handle = timestamp | date: '%B' | handleize %}
{% assign month_default = 'dates.months.default.' | append: month_handle | t %}
{% assign month_local = 'dates.months.' | append: month_handle | t %}
{% assign formatted = formatted | replace: month_default, month_local %}
```

## Locale file structure

Translation keys live at the root `dates.*` namespace.

In `en.default.json`, both `default` and non-default values are identical (replace is a no-op):

```json
{
  "dates": {
    "months": {
      "january": "January",
      "default": { "january": "January" }
    }
  }
}
```

In `fr.json`, `default` holds the English value (source for replace), non-default holds the translation:

```json
{
  "dates": {
    "months": {
      "january": "Janvier",
      "default": { "january": "January" }
    }
  }
}
```

## Theme check

Dynamic translation keys trigger `TranslationKeyExists` warnings. Wrap with:

```liquid
{% comment %} theme-check-disable TranslationKeyExists {% endcomment %}
{% comment %} ... dynamic t calls ... {% endcomment %}
{% comment %} theme-check-enable TranslationKeyExists {% endcomment %}
```

Or inside a `{%- liquid %}` block:

```liquid
# theme-check-disable TranslationKeyExists
assign month_default = 'dates.months.default.' | append: month_handle | t
assign month_local = 'dates.months.' | append: month_handle | t
# theme-check-enable TranslationKeyExists
```

## When to use

When displaying dates to customers in any context where the store supports multiple locales. The same pattern works for day names using `dates.days` keys.
