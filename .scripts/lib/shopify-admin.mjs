/**
 * shopify-admin.mjs — shared Admin API transport for the seed scripts.
 *
 * Zero dependencies (Node 18+ global fetch). Reads creds from .env (never
 * hardcoded, never committed): SHOPIFY_STORE, SHOPIFY_ACCESS_TOKEN,
 * SHOPIFY_API_VERSION. Imported by seed-metaobjects.mjs + seed-validation-assets.mjs
 * so the env loader, GraphQL transport, and user-error guard live in one place.
 */
import { readFileSync, existsSync } from 'node:fs';

function loadDotenv() {
  const env = {};
  if (existsSync('.env')) {
    for (const line of readFileSync('.env', 'utf8').split('\n')) {
      if (line.trimStart().startsWith('#')) continue;
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  }
  return env;
}

const env = loadDotenv();
export const STORE = env.SHOPIFY_STORE || process.env.SHOPIFY_STORE;
export const TOKEN = env.SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_ACCESS_TOKEN;
export const VERSION = env.SHOPIFY_API_VERSION || process.env.SHOPIFY_API_VERSION || '2026-04';

/** Exit early with a clear message when creds are absent. Call at the top of main(). */
export function requireCreds() {
  if (!STORE || !TOKEN) {
    console.error('Missing SHOPIFY_STORE / SHOPIFY_ACCESS_TOKEN (.env)');
    process.exit(1);
  }
}

const endpoint = () => `https://${STORE}.myshopify.com/admin/api/${VERSION}/graphql.json`;

/** POST a GraphQL operation; throws on transport-level errors. */
export async function gql(query, variables = {}) {
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error('GraphQL: ' + JSON.stringify(json.errors, null, 2));
  return json.data;
}

/** Throw when a mutation payload carries userErrors. */
export function assertNoUserErrors(label, payload) {
  const errs = payload?.userErrors ?? [];
  if (errs.length) throw new Error(`${label}: ` + JSON.stringify(errs));
}
