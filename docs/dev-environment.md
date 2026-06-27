# Dev environment

Operational runbook for serving, deploying, and provisioning a Token store. Orientation doc — the one place an agent or developer finds "how do I run this against a real store."

## Dev store

The canonical development store is **`tropheeagency`**, configured in `shopify.theme.toml`:

```toml
[environments.development]
store = "tropheeagency"
```

- **Serve (live reload):** `npm run dev` (= `shopify theme dev --environment development`).
- **Push:** `shopify theme push --environment development`.
- Non-theme folders are excluded from upload via `.shopifyignore`.

## Admin API credentials

Metaobject provisioning talks to the Admin GraphQL API. Credentials live in **`.env`** (gitignored — never commit, never paste into tracked files):

```
SHOPIFY_STORE, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, SHOPIFY_ACCESS_TOKEN, SHOPIFY_API_VERSION
```

`.env.example` is the committed template. The token comes from a custom app installed on the store with scopes `read/write_metaobject_definitions` + `read/write_metaobjects`. Rotate the token if it is ever exposed.

## Metaobject provisioning

The design system (colors, typography, spacing, …) lives in **store metaobjects**, not theme code — so a fresh store renders on fallbacks until provisioned.

```
node .scripts/seed-metaobjects.mjs
```

- **Idempotent + resumable:** definitions are created only when missing; entries go through `metaobjectUpsert` (keyed by handle). Re-run anytime — already-present definitions skip, entries upsert in place.
- **Reads creds from `.env`** (no secrets in the script).
- **Per new store:** install the custom app, populate `.env`, run once.

### Seed manifest (minimal EN catalog)

The script provisions all **11 definitions** and a minimal entry catalog: `theme_color` (brand neutrals + semantic `error`/`success`/`warning`/`info`), `gradient` (`hero`), `text_style` (`h1`–`h6` + `body`), `content_width` (narrow/reading/medium/wide), `icon` (one per `assets/icon-*.svg`, auto-enumerated), `button_style` (the 3×3 matrix), `container_style` (card/outlined/elevated), `media_size` (ratios + relative + fill), `spacing` (none/xs/sm/md/lg/xl).

**Not seeded:** `font` / `typeface` entries — store-specific (depend on the font files a store ships). Text styles leave `font_family` blank and fall back to system fonts until a typeface is added. Add font + typeface entries (and re-point `text_style.font_family`) when a brand font lands.

## Per-store GID coupling

Metaobject-typed settings (in `settings_data.json` and per-block settings) reference entries by **store-specific GID**. Pushing the theme to a new store leaves those pointing at stale GIDs that silently fall back to defaults (theme-check won't catch it; editor pickers show blank). After seeding a new store:

1. Set `settings_data.json` → `current.base_text_style` to the new store's `body` `text_style` GID (so `--base-*` aliases populate).
2. Re-bind any metaobject pickers in the editor (section/block settings referencing `media_size`, `text_style`, `theme_color`, etc.).

See `metaobject-definitions.md` § Per-store coupling for the full recovery procedure.

## Related

- `metaobject-definitions.md` — the type definitions + seed catalogs the script encodes
- `.scripts/seed-metaobjects.mjs` — the provisioning script
- `shopify.theme.toml` — environment / store config
