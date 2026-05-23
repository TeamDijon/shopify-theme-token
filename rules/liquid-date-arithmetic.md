---
paths:
  - "**/*.liquid"
---

# Date arithmetic in Liquid

Liquid has no date addition or subtraction. Unix timestamps (seconds since epoch) combined with basic math provide date arithmetic.

## Pattern

```liquid
{% comment %} Get current time as Unix timestamp {% endcomment %}
{% assign now_timestamp = 'now' | date: '%s' | plus: 0 %}

{% comment %} Add one day (86400 seconds) {% endcomment %}
{% assign tomorrow_timestamp = now_timestamp | plus: 86400 %}

{% comment %} Format back to readable date {% endcomment %}
{% assign tomorrow_date = tomorrow_timestamp | date: '%e %B %Y' | strip %}
```

## Useful constants

- One day: `86400` seconds
- One week: `604800` seconds

## Day of week detection

```liquid
{% assign day_of_week = timestamp | date: '%w' | plus: 0 %}
{% comment %} 0 = Sunday, 1 = Monday, ..., 6 = Saturday {% endcomment %}
```

## Date comparison

```liquid
{% assign date_a = '2026-04-01 12:00:00' | date: '%s' | plus: 0 %}
{% assign date_b = 'now' | date: '%s' | plus: 0 %}
{% if date_b >= date_a %}
  {% comment %} date_b is on or after date_a {% endcomment %}
{% endif %}
```

## Looping through days

Combining timestamp arithmetic with a for loop allows counting business days, finding the next available date, or iterating over a date range:

```liquid
{% assign current_timestamp = now_timestamp %}
{% for i in (1..30) %}
  {% assign current_timestamp = current_timestamp | plus: 86400 %}
  {% assign day_of_week = current_timestamp | date: '%w' | plus: 0 %}
  {% if day_of_week == 0 or day_of_week == 6 %}
    {% continue %}
  {% endif %}
  {% comment %} Process this weekday {% endcomment %}
{% endfor %}
```

## Formatting notes

- `%e` gives space-padded day (use `| strip` to remove leading space)
- `%d` gives zero-padded day
- `%B` gives full month name (always in English — see `.context/rules/liquid-date-translation.md` for locale support)
- `%Y%m%d` is useful for sort keys (lexicographic ordering matches chronological)

## When to use

When calculating future or past dates, comparing dates, building date ranges, or implementing any time-dependent logic in Liquid.
