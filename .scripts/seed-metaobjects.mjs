#!/usr/bin/env node
/**
 * seed-metaobjects.mjs — provision the Token design-system metaobjects on a Shopify store.
 *
 * Idempotent / resumable:
 *   - definitions are created only when missing (queried via metaobjectDefinitionByType);
 *   - entries go through metaobjectUpsert (keyed by handle), so re-running after a failure
 *     picks up where it left off and never duplicates.
 *
 * Zero dependencies (Node 18+ global fetch). Run from the repo root:
 *   node .scripts/seed-metaobjects.mjs
 *
 * Reads creds from .env (never hardcoded, never committed):
 *   SHOPIFY_STORE, SHOPIFY_ACCESS_TOKEN, SHOPIFY_API_VERSION
 *
 * Reference: .context/docs/metaobject-definitions.md (definitions + seed catalogs).
 * Scope: minimal EN catalog — enough to render a real page. font/typeface entries are
 * store-specific and intentionally NOT seeded (text styles fall back to system fonts).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';

// ---- env ----
const env = {};
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    if (line.trimStart().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2];
  }
}
const STORE = env.SHOPIFY_STORE || process.env.SHOPIFY_STORE;
const TOKEN = env.SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_ACCESS_TOKEN;
const VERSION = env.SHOPIFY_API_VERSION || process.env.SHOPIFY_API_VERSION || '2026-04';
if (!STORE || !TOKEN) {
  console.error('Missing SHOPIFY_STORE / SHOPIFY_ACCESS_TOKEN (.env)');
  process.exit(1);
}
const ENDPOINT = `https://${STORE}.myshopify.com/admin/api/${VERSION}/graphql.json`;

// ---- graphql ----
async function gql(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error('GraphQL: ' + JSON.stringify(json.errors, null, 2));
  return json.data;
}
function assertNoUserErrors(label, payload) {
  const errs = payload?.userErrors ?? [];
  if (errs.length) throw new Error(`${label}: ` + JSON.stringify(errs));
}

// ---- field + validation helpers ----
const field = (key, name, type, opts = {}) => ({
  key,
  name,
  type,
  required: !!opts.required,
  ...(opts.validations ? { validations: opts.validations } : {}),
});
const choices = (arr) => [{ name: 'choices', value: JSON.stringify(arr) }];
const regex = (re) => [{ name: 'regex', value: re }];
const ref = (gid) => [{ name: 'metaobject_definition_id', value: gid }];

const defIds = {}; // type -> gid (captured as we go, for reference validations)

async function ensureDefinition({ type, name, description, fieldDefinitions }) {
  const found = await gql(`query ($type: String!) { metaobjectDefinitionByType(type: $type) { id } }`, { type });
  if (found.metaobjectDefinitionByType?.id) {
    defIds[type] = found.metaobjectDefinitionByType.id;
    console.log(`def ${type}: exists`);
    return;
  }
  const data = await gql(
    `mutation ($definition: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $definition) {
        metaobjectDefinition { id type }
        userErrors { field message code }
      }
    }`,
    {
      definition: {
        type,
        name,
        description,
        displayNameKey: 'name',
        access: { admin: 'MERCHANT_READ_WRITE', storefront: 'PUBLIC_READ' },
        capabilities: { publishable: { enabled: true }, translatable: { enabled: true } },
        fieldDefinitions,
      },
    },
  );
  assertNoUserErrors(`def ${type}`, data.metaobjectDefinitionCreate);
  defIds[type] = data.metaobjectDefinitionCreate.metaobjectDefinition.id;
  console.log(`def ${type}: created`);
}

async function upsert(type, handle, fieldsObj) {
  const fields = Object.entries(fieldsObj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([key, value]) => ({ key, value: String(value) }));
  const data = await gql(
    `mutation ($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
      metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
        metaobject { id handle }
        userErrors { field message code }
      }
    }`,
    { handle: { type, handle }, metaobject: { fields, capabilities: { publishable: { status: 'ACTIVE' } } } },
  );
  assertNoUserErrors(`entry ${type}/${handle}`, data.metaobjectUpsert);
  console.log(`  ${type}/${handle}`);
}

const titleCase = (slug) => slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

// ============================================================
async function main() {
  console.log(`Seeding metaobjects on ${STORE} (${VERSION})\n`);

  // ---- definitions (order matters: font -> typeface -> text_style for references) ----
  await ensureDefinition({
    type: 'font',
    name: 'Font',
    description: 'A single font variant (one weight/style, or a variable-font weight range) used by a typeface',
    fieldDefinitions: [
      field('name', 'Name', 'single_line_text_field'),
      field('asset_list', 'Assets', 'list.file_reference'),
      field('style', 'Style', 'single_line_text_field', { validations: choices(['normal', 'italic', 'oblique']) }),
      field('weight', 'Weight', 'single_line_text_field', { validations: regex('^[1-9]00$') }),
      field('weight_range_start', 'Weight range start', 'single_line_text_field', { validations: regex('^[1-9]00$') }),
      field('weight_range_end', 'Weight range end', 'single_line_text_field', { validations: regex('^[1-9]00$') }),
    ],
  });
  await ensureDefinition({
    type: 'typeface',
    name: 'Typeface',
    description: 'Collection of fonts used in the theme',
    fieldDefinitions: [
      field('name', 'Name', 'single_line_text_field'),
      field('font_list', 'Fonts', 'list.metaobject_reference', { validations: ref(defIds.font) }),
    ],
  });
  await ensureDefinition({
    type: 'text_style',
    name: 'Text style',
    description: 'A reusable typography style applied via data-modifiers="text-style:<handle>" (and auto-bound to h1-h6)',
    fieldDefinitions: [
      field('name', 'Name', 'single_line_text_field'),
      field('font_family', 'Font family', 'metaobject_reference', { validations: ref(defIds.typeface) }),
      field('font_fallback_family', 'Fallback family', 'single_line_text_field', {
        validations: choices(['sans-serif', 'serif', 'mono']),
      }),
      field('font_style', 'Style', 'single_line_text_field', { validations: choices(['normal', 'italic', 'oblique']) }),
      field('weight', 'Weight', 'single_line_text_field', { validations: regex('^[1-9]00$') }),
      field('mobile_font_size', 'Mobile font size', 'number_decimal'),
      field('desktop_font_size', 'Desktop font size', 'number_decimal'),
      field('line_height', 'Line height', 'number_decimal'),
      field('letter_spacing', 'Letter spacing', 'number_decimal'),
      field('uppercase', 'Uppercase', 'boolean'),
      field('underline', 'Underline', 'boolean'),
    ],
  });
  await ensureDefinition({
    type: 'theme_color',
    name: 'Theme color',
    description: 'Color reference to be used on the theme data/settings',
    fieldDefinitions: [
      field('name', 'Name', 'single_line_text_field'),
      field('hex_code', 'Hexadecimal code', 'color', { required: true }),
    ],
  });
  await ensureDefinition({
    type: 'gradient',
    name: 'Gradient',
    description: 'Scheme-adaptive linear gradient built from two color-scheme roles',
    fieldDefinitions: [
      field('name', 'Name', 'single_line_text_field'),
      field('angle', 'Angle', 'number_integer', {
        required: true,
        validations: [
          { name: 'min', value: '0' },
          { name: 'max', value: '360' },
        ],
      }),
      field('color_start', 'Start color', 'single_line_text_field', {
        required: true,
        validations: choices(['background', 'foreground', 'primary']),
      }),
      field('color_end', 'End color', 'single_line_text_field', {
        required: true,
        validations: choices(['background', 'foreground', 'primary']),
      }),
    ],
  });
  await ensureDefinition({
    type: 'content_width',
    name: 'Content width',
    description: "A reusable max-width constraint applied to a section's content area",
    fieldDefinitions: [
      field('name', 'Name', 'single_line_text_field'),
      field('width', 'Width', 'number_decimal', { required: true }),
    ],
  });
  await ensureDefinition({
    type: 'icon',
    name: 'Icon',
    description: 'An SVG icon reference. Resolves to assets/icon-<file_name>.svg',
    fieldDefinitions: [
      field('name', 'Name', 'single_line_text_field'),
      field('file_name', 'File name', 'single_line_text_field', { required: true, validations: regex('^[a-z0-9-]+$') }),
      field('preset', 'Preset', 'single_line_text_field'),
    ],
  });
  await ensureDefinition({
    type: 'button_style',
    name: 'Button style',
    description: "A named button variant consumed via [data-modifiers*='button-style:<handle>']",
    fieldDefinitions: [field('name', 'Name', 'single_line_text_field')],
  });
  await ensureDefinition({
    type: 'container_style',
    name: 'Container style',
    description: "A named container variant consumed via [data-modifiers*='container-style:<handle>']",
    fieldDefinitions: [field('name', 'Name', 'single_line_text_field')],
  });
  await ensureDefinition({
    type: 'media_size',
    name: 'Media size',
    description: 'A sizing constraint applied to a media block (aspect ratio, height, or fill)',
    fieldDefinitions: [
      field('name', 'Name', 'single_line_text_field'),
      field('type', 'Type', 'single_line_text_field', { validations: choices(['ratio', 'relative', 'fixed']) }),
      field('value', 'Value', 'single_line_text_field'),
    ],
  });
  await ensureDefinition({
    type: 'spacing',
    name: 'Spacing',
    description: 'A reusable spacing token for vertical rhythm. Each token carries a mobile and desktop px value',
    fieldDefinitions: [
      field('name', 'Name', 'single_line_text_field'),
      field('mobile_value', 'Mobile value', 'number_decimal', { required: true }),
      field('desktop_value', 'Desktop value', 'number_decimal', { required: true }),
    ],
  });

  // ---- entries (minimal catalog) ----
  console.log('\nseeding entries...');

  // theme_color — a few brand neutrals + the load-bearing semantic set (error drives form-field, etc.)
  const colors = [
    ['primary', 'Primary', '#2E5BFF'],
    ['accent', 'Accent', '#FF6B35'],
    ['ink', 'Ink', '#14181F'],
    ['paper', 'Paper', '#FFFFFF'],
    ['muted', 'Muted', '#6B7280'],
    ['error', 'Error', '#D7263D'],
    ['success', 'Success', '#1B998B'],
    ['warning', 'Warning', '#F4A300'],
    ['info', 'Info', '#2E5BFF'],
  ];
  for (const [handle, name, hex] of colors) await upsert('theme_color', handle, { name, hex_code: hex });

  // gradient — one starter
  await upsert('gradient', 'hero', { name: 'Hero', angle: 135, color_start: 'primary', color_end: 'background' });

  // text_style — h1-h6 + body (font_family left blank -> system-font fallback)
  const textStyles = [
    ['h1', 'H1', 32, 48, 1.2, 700],
    ['h2', 'H2', 28, 40, 1.25, 700],
    ['h3', 'H3', 24, 32, 1.3, 600],
    ['h4', 'H4', 20, 24, 1.4, 600],
    ['h5', 'H5', 18, 20, 1.4, 600],
    ['h6', 'H6', 16, 18, 1.5, 600],
    ['body', 'Body', 16, 16, 1.5, 400],
  ];
  for (const [handle, name, m, d, lh, w] of textStyles)
    await upsert('text_style', handle, {
      name,
      font_fallback_family: 'sans-serif',
      mobile_font_size: m,
      desktop_font_size: d,
      line_height: lh,
      weight: w,
    });

  // content_width
  const widths = [
    ['narrow', 'Narrow', 600],
    ['reading', 'Reading', 680],
    ['medium', 'Medium', 1000],
    ['wide', 'Wide', 1400],
  ];
  for (const [handle, name, width] of widths) await upsert('content_width', handle, { name, width });

  // icon — enumerate assets/icon-*.svg
  const icons = existsSync('assets')
    ? readdirSync('assets')
        .filter((f) => /^icon-.+\.svg$/.test(f))
        .map((f) => f.replace(/^icon-/, '').replace(/\.svg$/, ''))
    : [];
  for (const slug of icons) await upsert('icon', slug, { name: titleCase(slug), file_name: slug });
  if (!icons.length) console.log('  (no assets/icon-*.svg found)');

  // button_style — the 3x3 matrix the snippet stylesheet covers
  for (const fam of ['solid', 'outline', 'link'])
    for (const variant of ['primary', 'secondary', 'tertiary'])
      await upsert('button_style', `${fam}-${variant}`, { name: `${titleCase(fam)} ${variant}` });

  // container_style
  for (const [handle, name] of [
    ['card', 'Card'],
    ['outlined', 'Outlined'],
    ['elevated', 'Elevated'],
  ])
    await upsert('container_style', handle, { name });

  // media_size
  const mediaSizes = [
    ['1-1', '1:1 (Square)', 'ratio', '1/1'],
    ['4-3', '4:3', 'ratio', '4/3'],
    ['3-2', '3:2', 'ratio', '3/2'],
    ['16-9', '16:9 (Widescreen)', 'ratio', '16/9'],
    ['9-16', '9:16 (Vertical)', 'ratio', '9/16'],
    ['4-5', '4:5 (Portrait)', 'ratio', '4/5'],
    ['half-screen', 'Half screen', 'relative', '50svh'],
    ['full-screen', 'Full screen', 'relative', '100svh'],
    ['fill', 'Fill', '', ''],
  ];
  for (const [handle, name, type, value] of mediaSizes) await upsert('media_size', handle, { name, type, value });

  // spacing — T-shirt scale
  const spacings = [
    ['none', 'None', 0, 0],
    ['xs', 'Extra small', 4, 8],
    ['sm', 'Small', 8, 12],
    ['md', 'Medium', 16, 24],
    ['lg', 'Large', 32, 48],
    ['xl', 'Extra large', 64, 96],
  ];
  for (const [handle, name, mobile_value, desktop_value] of spacings)
    await upsert('spacing', handle, { name, mobile_value, desktop_value });

  console.log('\nDone. Re-run anytime — definitions skip if present, entries upsert by handle.');
}

main().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
