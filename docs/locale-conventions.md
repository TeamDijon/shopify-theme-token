# Locale conventions

The theme ships two files per language: a runtime locale and a schema locale.

- **Default locale** (English): `locales/en.default.json` + `locales/en.default.schema.json`
- **Non-default locales** (e.g. French): `locales/fr.json` + `locales/fr.schema.json`

One file pair per supported language. The `.default` suffix identifies the source-of-truth locale (developer-authored). When adding a new language, add both the runtime and schema files; keep every language's key set in sync with the default (non-default editors otherwise show fallback English strings on missing keys).

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
| `dates` | Dates subsystem — see `.context/docs/liquid-dates.md` |

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
- Dynamic keys (e.g. `'dates.months.' | append: handle | t`) need `theme-check-disable TranslationKeyExists` around them — see `.context/docs/liquid-dates.md`

## Dates subsystem

The `dates` namespace follows a special pattern to work around Liquid's English-only `date` filter. Structure:

- `dates.formats.default` — date format string
- `dates.days.<handle>` + `dates.days.default.<handle>` — locale + English-source pair for translation-replace
- `dates.months.<handle>` + `dates.months.default.<handle>` — same

See `.context/docs/liquid-dates.md` for the replacement pattern.

## Schema file (`*.schema.json`)

Schema translations live in `*.schema.json` and are referenced from schema JSON via the `t:` prefix. Unlike runtime translations (`| t` filter on strings), schema translations are resolved by Shopify at theme-editor display time.

### Reference syntax

```json
{
  "name": "t:spacing.name",
  "settings": [
    { "type": "header", "content": "t:spacing.gutter.content" },
    { "type": "range", "id": "mobile_gutter", "label": "t:spacing.gutter.mobile", ... }
  ]
}
```

The `t:` prefix accepts dotted keys resolving into `*.schema.json`. Shopify's docs example: `t:sections.product.name`.

### Translatable fields

The following schema fields accept `t:` values:

- Section / block: `name`
- All settings: `label`, `info`
- `header` and `paragraph` settings: `content`
- `select` options: `group`
- `text`, `textarea`, etc.: `placeholder`
- `range`: `unit`
- Presets: `name`, `category`
- Content fields (text, richtext, video, etc.): `default`

Other fields (ids, defaults for numeric/color/boolean types, types, roles) are NOT translatable and stay hardcoded.

### Key structure (project convention)

Top-level keys are **setting groups** (`spacing`, `colors`, `typography`, `favicon`) or **section/block types** (`sections.foo`, `blocks.bar`). Inside each group, organize by purpose:

- `<group>.name` — the group title
- `<group>.<subgroup>.<field>` — scoped setting fields. Examples:
  - `spacing.gutter.mobile` — mobile gutter label
  - `colors.scheme.background` — background color label (reused across button bg, input bg, etc.)
  - `colors.meta_theme_color.info` — info text for the meta_theme_color setting

Reuse keys when the string is identical across settings (e.g. `colors.scheme.background` is the label for `background`, `primary_button_background`, `secondary_button_background`, `input_background` — all "Background").

### Admin-editor overwrites

The Shopify admin language editor can overwrite `*.schema.json` when merchants edit labels through the UI. Agents editing this file should:

- Expect re-applied patches after admin edits
- Keep changes small and focused
- Not batch unrelated edits into a single patch

## Related

- Date translation pattern: `.context/docs/liquid-dates.md`
- Shopify `t:` docs: https://shopify.dev/docs/storefronts/themes/architecture/locales/schema-locale-files
