#!/usr/bin/env node
/**
 * context-lint — mechanical drift checks for the `.context/` knowledge layer.
 * Zero dependencies. Run from the repo root: `node .scripts/context-lint.mjs`.
 *
 * Checks:
 *   1. pin    — spec `path vX.Y.Z` pins vs the referenced file's version header.
 *   2. index  — every spec file is referenced in specs-index.md; every index link resolves.
 *   3. tally  — rule line counts recorded in CLAUDE.md match the files on disk.
 *
 * Exits non-zero when any check fails, so it can gate `npm run check` / pre-commit.
 * Irreducibly-manual checks (Reviewed sign-off, spec-vs-code semantic accuracy,
 * substrate-CSS pin-by-description) are deliberately out of scope.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SPECS_DIR = join(ROOT, ".context", "specs");
const RULES_DIR = join(ROOT, ".context", "rules");
const INDEX = join(SPECS_DIR, "specs-index.md");
const CLAUDE = join(ROOT, "CLAUDE.md");

const findings = [];
const note = (check, msg) => findings.push({ check, msg });
const read = (p) => readFileSync(p, "utf8");
const lineCount = (p) => read(p).split("\n").length - 1; // matches `wc -l`

// ---- 1. pin ↔ version drift ----
// Matches `path/to/file.liquid` v1.2.3 (or .js) anywhere in a spec: Implementation,
// Consumers, Depends on, inline. CSS pins use a description (no vX.Y.Z) and are skipped.
const PIN_RE = /`([\w./-]+\.(?:liquid|js))`\s+v(\d+\.\d+\.\d+)/g;

const fileVersion = (abs) => {
  const src = read(abs);
  if (abs.endsWith(".liquid")) {
    const m = src.match(/\{%-?\s*#\s*.*?\bv(\d+\.\d+\.\d+)\s*-?%\}/);
    return m ? m[1] : null;
  }
  if (abs.endsWith(".js")) {
    const m = src.match(/@version\s+(\d+\.\d+\.\d+)/);
    return m ? m[1] : null;
  }
  return null;
};

const specFiles = existsSync(SPECS_DIR)
  ? readdirSync(SPECS_DIR).filter((f) => f.endsWith(".md"))
  : [];

const NON_SPEC = new Set(["_spec-feedback.md", "_template.md"]); // working log + scaffold, not contracts
const seenPin = new Set();
for (const f of specFiles) {
  if (NON_SPEC.has(f)) continue;
  // Pins live in the header fields (Implementation / Consumers / Depends on); scan only
  // the block before the first `## ` section so prose version-mentions don't false-positive.
  const header = read(join(SPECS_DIR, f)).split(/\n##\s/)[0];
  for (const [, rel, pinned] of header.matchAll(PIN_RE)) {
    const key = `${f}|${rel}|${pinned}`;
    if (seenPin.has(key)) continue;
    seenPin.add(key);
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) {
      note("pin", `${f}: pins \`${rel}\` v${pinned} — file not found`);
      continue;
    }
    const actual = fileVersion(abs);
    if (actual === null) note("pin", `${f}: pins \`${rel}\` v${pinned} — no version header in file`);
    else if (actual !== pinned) note("pin", `${f}: pins \`${rel}\` v${pinned} — file is v${actual}`);
  }
}

// ---- 2. specs-index coverage ----
if (existsSync(INDEX)) {
  const indexSrc = read(INDEX);
  const IGNORE = new Set(["specs-index.md", "_template.md", "_spec-feedback.md"]);
  // (a) every spec file is named somewhere in the index
  for (const f of specFiles) {
    if (IGNORE.has(f)) continue;
    const name = f.replace(/\.md$/, "");
    if (!indexSrc.includes(name)) note("index", `${f} not referenced in specs-index.md`);
  }
  // (b) every index link `](./name.md)` resolves to a file
  for (const [, target] of indexSrc.matchAll(/\]\(\.\/([\w-]+)\.md\)/g)) {
    if (!existsSync(join(SPECS_DIR, `${target}.md`)))
      note("index", `specs-index links ./${target}.md — file missing`);
  }
}

// ---- 3. CLAUDE.md tally ----
if (existsSync(CLAUDE)) {
  const claudeSrc = read(CLAUDE);
  const seenTally = new Set();
  // `rule.md` followed by ` | N` (table cell) or ` (N)` (inline) — rule files only.
  for (const [, rule, claimed] of claudeSrc.matchAll(/`([\w-]+\.md)`\s*[|(]\s*(\d+)/g)) {
    const abs = join(RULES_DIR, rule);
    if (!existsSync(abs)) continue;
    const key = `${rule}=${claimed}`;
    if (seenTally.has(key)) continue;
    seenTally.add(key);
    const actual = lineCount(abs);
    if (actual !== Number(claimed))
      note("tally", `CLAUDE.md records ${rule} = ${claimed}, actual ${actual}`);
  }
}

// ---- report ----
if (findings.length === 0) {
  console.log("context-lint: clean ✓  (pins, specs-index, CLAUDE.md tally)");
  process.exit(0);
}
const byCheck = {};
for (const { check, msg } of findings) (byCheck[check] ??= []).push(msg);
for (const [check, msgs] of Object.entries(byCheck)) {
  console.log(`\n[${check}] ${msgs.length} issue(s):`);
  for (const m of msgs) console.log(`  - ${m}`);
}
console.log(`\ncontext-lint: ${findings.length} issue(s) found`);
process.exit(1);
