# Dates in Liquid

Liquid has no date arithmetic, and its `date` filter returns English month and day names regardless of store locale. Two patterns cover the gap: timestamp math for arithmetic, and translation-key replacement for localization.

## Arithmetic

Unix timestamps (seconds since epoch) combined with basic math provide date arithmetic.

```liquid
{% comment %} Current time as a Unix timestamp {% endcomment %}
{% assign now_timestamp = 'now' | date: '%s' | plus: 0 %}

{% comment %} Add one day (86400 seconds) {% endcomment %}
{% assign tomorrow_timestamp = now_timestamp | plus: 86400 %}

{% comment %} Format back to a readable date {% endcomment %}
{% assign tomorrow_date = tomorrow_timestamp | date: '%e %B %Y' | strip %}
```

Constants: one day `86400`, one week `604800`.

### Day of week

```liquid
{% assign day_of_week = timestamp | date: '%w' | plus: 0 %}
{% comment %} 0 = Sunday … 6 = Saturday {% endcomment %}
```

### Comparison

```liquid
{% assign date_a = '2026-04-01 12:00:00' | date: '%s' | plus: 0 %}
{% assign date_b = 'now' | date: '%s' | plus: 0 %}
{% if date_b >= date_a %}
  {% comment %} date_b is on or after date_a {% endcomment %}
{% endif %}
```

### Looping through days

Timestamp arithmetic inside a `for` loop counts business days, finds the next available date, or iterates a date range:

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

### Format codes

- `%e` — space-padded day (`| strip` removes the leading space)
- `%d` — zero-padded day
- `%B` — full month name (always English; localize via Translation below)
- `%Y%m%d` — sort key (lexicographic order matches chronological)

## Translation

The `date` filter returns English names; a string replacement against translation keys localizes them.

```liquid
{% assign formatted = timestamp | date: '%e %B' | strip %}
{% assign month_handle = timestamp | date: '%B' | handleize %}
{% assign month_default = 'dates.months.default.' | append: month_handle | t %}
{% assign month_local = 'dates.months.' | append: month_handle | t %}
{% assign formatted = formatted | replace: month_default, month_local %}
```

The same pattern localizes day names via `dates.days` keys.

### Locale file structure

Keys live at the root `dates.*` namespace. `en.default.json` holds identical `default` and non-default values, so the replace is a no-op; `fr.json` holds the English source under `default` and the translation under the non-default key.

```json
// en.default.json
{ "dates": { "months": { "january": "January", "default": { "january": "January" } } } }

// fr.json
{ "dates": { "months": { "january": "Janvier", "default": { "january": "January" } } } }
```

### Theme check

Dynamic translation keys trigger `TranslationKeyExists` warnings. Wrap the dynamic `t` calls:

```liquid
# theme-check-disable TranslationKeyExists
assign month_default = 'dates.months.default.' | append: month_handle | t
assign month_local = 'dates.months.' | append: month_handle | t
# theme-check-enable TranslationKeyExists
```

## When to use

Arithmetic — calculating future or past dates, comparing dates, building date ranges, any time-dependent logic. Translation — displaying dates to customers in any multi-locale store.

## Related

- `.context/docs/locale-conventions.md` — locale file structure
```

