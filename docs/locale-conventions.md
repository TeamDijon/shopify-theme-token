# Locale conventions

The theme ships two files per language: a runtime locale and a schema locale.

- **Default locale** (English): `locales/en.default.json` + `locales/en.default.schema.json`
- **Non-default locales** (e.g. French): `locales/fr.json` + `locales/fr.schema.json`

One file pair per supported language. The `.default` suffix identifies the source-of-truth locale (developer-authored). When adding a new language, add both the runtime and schema files; keep every language's key set in sync with the default.

## Files

- `<lang>[.default].json` — **runtime translations** consumed by Liquid `| t` filters
- `<lang>[.default].schema.json` — **schema translations** for settings UI labels (section names, setting labels, option labels). Shopify admin editor may overwrite these; agents should edit sparingly.

**Comment headers**: non-default locale files (both runtime and schema) carry a Shopify-allowed `/* ... */` header warning about admin-editor overwrites. Default locale runtime file (`en.default.json`) is developer-authored and doesn't need the warning.

This doc covers the runtime file's key architecture. The schema file follows Shopify's own key structure (`sections.<type>.*`, `settings_schema.<id>.*`, etc.) and isn't something we organize ourselves.

## Three categories of keys

### 1. Cross-cutting top-level namespaces

For content used across 2+ domains:

| Namespace | Use for |
|---|---|
| `actions` | Verbs: `skip_to_content`, `close`, `submit`, `back` |
| `labels` | Static nouns/titles: `home`, `menu`, `search` |
| `info` | Descriptive copy, help text, paragraphs |
| `errors` | Error messages |
| `accessibility` | SR-only strings |
| `dates` | Dates subsystem — see `.claude/rules/liquid-date-translation.md` |

Omit a namespace entirely when empty — don't ship `"info": {}`.

### 2. Domain namespaces

For content scoped to one area:

- `product.*`, `cart.*`, `collection.*`, `checkout.*`, `customer.*`, `blog.*`, `search.*`

Inside a domain, the same sub-structure applies: `product.actions.add_to_cart`, `product.labels.price`, `cart.errors.empty`.

### 3. Section / block handles

For strings scoped to a single section or block, key root = the file handle:

- `sections/faq.liquid` → `faq.actions.show_answer`, `faq.labels.title_prefix`
- `blocks/hero.liquid` → `hero.labels.badge`

## Decision flow when adding a string

```
Is it used in only one section or block?
 └─ yes → key root = section/block handle (e.g. `faq.actions.show_answer`)
 └─ no  → Is it specific to one domain (product, cart, collection, etc.)?
     └─ yes → key root = domain namespace (e.g. `product.actions.add_to_cart`)
     └─ no  → key root = cross-cutting namespace (e.g. `actions.close`)

Is it accessibility / SR-only?
 └─ regardless of scope, put under `accessibility.*`
```

## Key-naming rules

- snake_case (matches Shopify's built-in keys)
- Verbs go under `actions`, nouns under `labels`, paragraphs under `info`
- Plural-sensitive keys use Shopify's `one` / `other` pattern: `dates.days.one`, `dates.days.other`
- Dynamic keys (e.g. `'dates.months.' | append: handle | t`) need `theme-check-disable TranslationKeyExists` around them — see `.claude/rules/liquid-date-translation.md`

## Dates subsystem

The `dates` namespace follows a special pattern to work around Liquid's English-only `date` filter. Structure:

- `dates.formats.default` — date format string
- `dates.days.<handle>` + `dates.days.default.<handle>` — locale + English-source pair for translation-replace
- `dates.months.<handle>` + `dates.months.default.<handle>` — same

See `.claude/rules/liquid-date-translation.md` for the replacement pattern.

## Schema file (`*.schema.json`)

Schema translations live in a separate file. Shopify's keys are dictated:

- `general.*` — top-level theme settings
- `sections.<type>.*` — section UI labels (name, settings, option labels)
- `blocks.<type>.*` — block UI labels
- `settings_schema.<setting_id>.*` — detailed settings translations

Agent-editable now that scale is manageable, but expect the Shopify admin language editor to overwrite. Keep hand-edits small and treat the file as soft-shared state with the admin.

## Related

- Date translation pattern: `.claude/rules/liquid-date-translation.md`
