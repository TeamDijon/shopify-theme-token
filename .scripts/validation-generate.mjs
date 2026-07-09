#!/usr/bin/env node
/**
 * validation-generate — stage a colocated validation fixture into the generic
 * `?view=validation` slot. Zero dependencies. Run from the repo root:
 *   node .scripts/validation-generate.mjs <element>
 *
 * Reads the colocated `<element>.validation.json` source (located by name beside
 * the element's code — glob discovery, so it works whether the source sits in
 * snippets/, blocks/, or assets/), wraps it in the Shopify JSON-template envelope,
 * and writes templates/index.validation.json (gitignored; pushed for the test run,
 * then removed by validation-clean).
 *
 * The wrap is purely structural: the source carries { settings, blocks,
 * block_order }; the section type is always the generic `validation` harness.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "templates", "index.validation.json");
const SEARCH_DIRS = ["snippets", "blocks", "assets"];

const el = process.argv[2];
if (!el) {
  console.error("usage: node .scripts/validation-generate.mjs <element>");
  process.exit(1);
}

const srcPath = SEARCH_DIRS.map((d) => join(ROOT, d, `${el}.validation.json`)).find(
  (p) => existsSync(p),
);

if (!srcPath) {
  console.error(`no colocated source found: {${SEARCH_DIRS.join(",")}}/${el}.validation.json`);
  process.exit(1);
}

const source = JSON.parse(readFileSync(srcPath, "utf8"));
const template = {
  sections: { main: { type: "validation", ...source } },
  order: ["main"],
};
writeFileSync(OUT, JSON.stringify(template, null, 2) + "\n");

const blocks = Object.keys(source.blocks || {}).length;
console.log(`generated ${relative(ROOT, OUT)} from ${relative(ROOT, srcPath)} (${blocks} blocks) — reach at /?view=validation`);
