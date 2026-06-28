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

// contentType drives the staged-upload resource + fileCreate contentType.
// Images reference in theme settings as shopify://shop_images/<filename> (confirmed).
// The video reference form is verified during the video L0 page build (Shopify-hosted
// video may differ; the handle may not survive upload). A missing binary is skipped
// (warn), so this stays runnable before the user-supplied clip.mp4 lands.
const ASSETS = [
  { filename: 'landscape.png', mimeType: 'image/png', contentType: 'IMAGE', alt: 'Validation landscape placeholder' },
  { filename: 'portrait.png', mimeType: 'image/png', contentType: 'IMAGE', alt: 'Validation portrait placeholder' },
  { filename: 'clip.mp4', mimeType: 'video/mp4', contentType: 'VIDEO', alt: 'Validation video clip' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findFile(filename) {
  const data = await gql(
    `query ($q: String!) {
      files(first: 1, query: $q) {
        edges { node { fileStatus alt ... on MediaImage { id } ... on Video { id } } }
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
        {
          filename: asset.filename,
          mimeType: asset.mimeType,
          resource: asset.contentType,
          httpMethod: 'POST',
          fileSize: String(size),
        },
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
        files { fileStatus alt ... on MediaImage { id } ... on Video { id } }
        userErrors { field message }
      }
    }`,
    { files: [{ originalSource: resourceUrl, contentType: asset.contentType, alt: asset.alt, filename: asset.filename }] },
  );
  assertNoUserErrors('fileCreate', data.fileCreate);
}

// Videos process slower than images, so allow a longer window.
async function waitReady(filename, tries = 60) {
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
    const ref =
      asset.contentType === 'IMAGE'
        ? `shopify://shop_images/${asset.filename}`
        : '(video — verify reference form during the video L0 page build)';

    const existing = await findFile(asset.filename);
    if (existing?.fileStatus === 'READY') {
      console.log(`  ${asset.filename}: exists (READY) — ${ref}`);
      continue;
    }
    const path = `${DIR}/${asset.filename}`;
    if (!existsSync(path)) {
      console.log(`  ${asset.filename}: SKIPPED — binary not found at ${path}`);
      continue;
    }
    const bytes = readFileSync(path);
    const target = await stageUpload(asset, bytes.length);
    await putBinary(target, bytes, asset.filename);
    await createFile(asset, target.resourceUrl);
    await waitReady(asset.filename);
    console.log(`  ${asset.filename}: uploaded — ${ref}`);
  }

  console.log('\nDone. Images reference as shopify://shop_images/<filename>. Re-run anytime — present files skip, missing binaries are skipped.');
}

main().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
