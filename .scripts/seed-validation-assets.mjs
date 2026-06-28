#!/usr/bin/env node
/**
 * seed-validation-assets.mjs — upload the L0 image/video validation assets to the
 * store's Files, so image.liquid / video.liquid validation pages can reference
 * real media objects (the snippets need image/video OBJECTS, not theme-asset URLs).
 *
 * Idempotent: each asset is looked up by filename first (files query); present +
 * READY → skipped. Otherwise staged-uploaded → fileCreate → polled to READY.
 * Filenames are deterministic, so the theme references them by a stable handle:
 *   shopify://shop_images/<filename>
 *
 * Binaries live in .scripts/seed/assets/ (generate with generate-assets.mjs).
 * Zero dependencies (Node 18+ global fetch / FormData / Blob). Run from repo root:
 *   node .scripts/seed-validation-assets.mjs
 *
 * Scope: requires the access token to carry `write_files` (in addition to the
 * metaobject scopes the sibling seeder uses — one custom-app token holds both).
 * Reads creds from .env (never committed).
 */
import { readFileSync, existsSync } from 'node:fs';
import { STORE, VERSION, requireCreds, gql, assertNoUserErrors } from './lib/shopify-admin.mjs';

const DIR = '.scripts/seed/assets';

// Images only for now. Video assets get added when the video L0 page is built
// (the video reference form needs a manual spike after the first upload).
const ASSETS = [
  { filename: 'landscape.png', mimeType: 'image/png', alt: 'Validation landscape placeholder' },
  { filename: 'portrait.png', mimeType: 'image/png', alt: 'Validation portrait placeholder' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findFile(filename) {
  const data = await gql(
    `query ($q: String!) {
      files(first: 1, query: $q) {
        edges { node { fileStatus alt ... on MediaImage { id image { url } } } }
      }
    }`,
    { q: `filename:${filename}` },
  );
  return data.files.edges[0]?.node ?? null;
}

async function stageUpload(asset, size) {
  const data = await gql(
    `mutation ($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }`,
    {
      input: [
        { filename: asset.filename, mimeType: asset.mimeType, resource: 'IMAGE', httpMethod: 'POST', fileSize: String(size) },
      ],
    },
  );
  assertNoUserErrors('stagedUploadsCreate', data.stagedUploadsCreate);
  return data.stagedUploadsCreate.stagedTargets[0];
}

async function putBinary(target, bytes, filename) {
  const form = new FormData();
  for (const { name, value } of target.parameters) form.append(name, value);
  form.append('file', new Blob([bytes]), filename); // file MUST be appended last
  const res = await fetch(target.url, { method: 'POST', body: form });
  if (res.status >= 300) throw new Error(`staged upload failed (${res.status}): ${await res.text()}`);
}

async function createFile(asset, resourceUrl) {
  const data = await gql(
    `mutation ($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files { fileStatus alt ... on MediaImage { id } }
        userErrors { field message }
      }
    }`,
    { files: [{ originalSource: resourceUrl, contentType: 'IMAGE', alt: asset.alt, filename: asset.filename }] },
  );
  assertNoUserErrors('fileCreate', data.fileCreate);
}

async function waitReady(filename, tries = 30) {
  for (let i = 0; i < tries; i++) {
    const f = await findFile(filename);
    if (f?.fileStatus === 'READY') return;
    if (f?.fileStatus === 'FAILED') throw new Error(`${filename}: processing FAILED`);
    await sleep(2000);
  }
  throw new Error(`${filename}: not READY after ${tries} polls`);
}

async function main() {
  requireCreds();
  console.log(`Seeding validation assets on ${STORE} (${VERSION})\n`);

  for (const asset of ASSETS) {
    const existing = await findFile(asset.filename);
    if (existing?.fileStatus === 'READY') {
      console.log(`  ${asset.filename}: exists (READY) — shopify://shop_images/${asset.filename}`);
      continue;
    }
    const path = `${DIR}/${asset.filename}`;
    if (!existsSync(path)) throw new Error(`missing binary: ${path} — run: node .scripts/seed/generate-assets.mjs`);
    const bytes = readFileSync(path);
    const target = await stageUpload(asset, bytes.length);
    await putBinary(target, bytes, asset.filename);
    await createFile(asset, target.resourceUrl);
    await waitReady(asset.filename);
    console.log(`  ${asset.filename}: uploaded — shopify://shop_images/${asset.filename}`);
  }

  console.log('\nDone. Reference in theme settings as shopify://shop_images/<filename>. Re-run anytime — present files skip.');
}

main().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
