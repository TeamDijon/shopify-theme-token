#!/usr/bin/env node
/**
 * validation-clean — remove the generated validation template. Zero dependencies.
 * Run from the repo root: node .scripts/validation-clean.mjs
 *
 * The generic-slot model produces exactly one generated file
 * (templates/index.validation.json), so cleaning is a single explicit rm — no
 * globs, no wildcards (the playwright-cleanup precedent). Idempotent: a missing
 * file is a no-op, so a failed drop mid-run is safe to re-run.
 */
import { rmSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "templates", "index.validation.json");

try {
  rmSync(OUT);
  console.log("removed templates/index.validation.json");
} catch (err) {
  if (err.code === "ENOENT") {
    console.log("templates/index.validation.json already absent (no-op)");
  } else {
    throw err;
  }
}
