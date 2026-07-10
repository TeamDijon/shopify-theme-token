#!/usr/bin/env node
/**
 * validation-generate — stage a colocated validation fixture into the generic
 * `?view=validation` slot. Zero dependencies. Run from the repo root:
 *   node .scripts/validation-generate.mjs <element>
 *
 * Reads the colocated `<element>.validation.json` source (located by name beside
 * the element's code — glob discovery across snippets/, blocks/, sections/, assets/,
 * layout/), wraps it in the Shopify JSON-template envelope, and writes
 * templates/index.validation.json (gitignored; pushed for the test run, then removed
 * by validation-clean).
 *
 * The wrap is purely structural: the source carries { settings, blocks, block_order }
 * consumed by the generic `validation` harness. A source may also name a dedicated
 * harness via `"harness": "<section-type>"` — snippet-only primitives (image / video)
 * whose case matrix is Liquid `{% render %}` logic, not block data, point at their own
 * committed harness section; everything else defaults to the generic block harness.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "templates", "index.validation.json");
const SEARCH_DIRS = ["snippets", "blocks", "sections", "assets", "layout"];

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

const { harness = "validation", ...rest } = JSON.parse(readFileSync(srcPath, "utf8"));
const template = {
  sections: { main: { type: harness, ...rest } },
  order: ["main"],
};
writeFileSync(OUT, JSON.stringify(template, null, 2) + "\n");

const blocks = Object.keys(rest.blocks || {}).length;
const via = harness === "validation" ? "" : ` (harness: ${harness})`;
console.log(`generated ${relative(ROOT, OUT)} from ${relative(ROOT, srcPath)} (${blocks} blocks)${via} — reach at /?view=validation`);
