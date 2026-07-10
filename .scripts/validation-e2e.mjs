#!/usr/bin/env node
/**
 * validation-e2e — serialized validation test orchestrator (Slice 3c / D3).
 *
 * The generic `?view=validation` slot is a single generated template, so
 * generate-and-drop elements can't be staged at once. This runner loops them one at
 * a time: generate the colocated fixture → wait for `theme dev` to sync → run that
 * element's colocated test → drop the fixture. It then runs the bespoke suites
 * (image / video / presets) that hit their own committed pages (no generation).
 *
 * Requires `npm run dev` (theme dev) running — tests hit the dev preview.
 * Tune the sync gap with VALIDATION_SETTLE_MS (default 2000).
 * Run: npm run test:e2e
 */
import { execSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SETTLE_MS = Number(process.env.VALIDATION_SETTLE_MS || 2000);
const SEARCH_DIRS = ["snippets", "blocks", "assets"];

// Discover generate-and-drop elements: colocated <el>.validation.json + sibling <el>.test.js.
const genDrop = [];
for (const dir of SEARCH_DIRS) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) continue;
  for (const f of readdirSync(abs)) {
    if (!f.endsWith(".validation.json")) continue;
    const el = f.replace(/\.validation\.json$/, "");
    if (existsSync(join(abs, `${el}.test.js`))) genDrop.push({ el, test: `${dir}/${el}.test.js` });
  }
}
genDrop.sort((a, b) => a.el.localeCompare(b.el));

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const failures = [];

console.log(`validation-e2e: ${genDrop.length} generate-and-drop element(s), serialized through ?view=validation`);

for (const { el, test } of genDrop) {
  console.log(`\n──── ${el} ────`);
  try {
    run(`node .scripts/validation-generate.mjs ${el}`);
    await sleep(SETTLE_MS);
    run(`npx playwright test ${test}`);
  } catch {
    failures.push(el);
  } finally {
    run(`node .scripts/validation-clean.mjs`);
  }
}

// Bespoke pages (image / video / presets) hit their own committed templates — no generation.
console.log(`\n──── bespoke pages (image / video / presets) ────`);
try {
  run(`npx playwright test .tests/e2e`);
} catch {
  failures.push(".tests/e2e (bespoke)");
}

console.log("");
if (failures.length) {
  console.error(`validation-e2e: FAIL — ${failures.join(", ")}`);
  process.exit(1);
}
console.log("validation-e2e: all suites passed ✓");
