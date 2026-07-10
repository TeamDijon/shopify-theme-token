#!/usr/bin/env node
/**
 * context-lint — mechanical drift checks for the knowledge layer.
 * Zero dependencies. Run from the repo root: `node .scripts/context-lint.mjs`.
 *
 * Checks:
 *   1. tally      — rule line counts recorded in CLAUDE.md match the files on disk.
 *   2. colocation — every colocated `<name>.spec.md` beside code has its Implementation
 *                   pins matching the referenced files' version headers. A sibling
 *                   `<name>.test.js` is optional (utility JS/CSS + metaobject showcases
 *                   carry no Playwright coverage).
 *   3. placement  — `.context/specs/` holds only the template + feedback log; a stray
 *                   `<name>.md` there means a spec was authored in the retired location
 *                   instead of colocated beside its code.
 *
 * Specs now colocate beside their code (discovered by glob), so the former `pin` and
 * `index` checks against `.context/specs/` + `specs-index.md` are retired — the
 * colocation check subsumes pin validation.
 *
 * Exits non-zero when any check fails, so it can gate `npm run check` / pre-commit.
 * Irreducibly-manual checks (Reviewed sign-off, spec-vs-code semantic accuracy,
 * substrate-CSS pin-by-description) are deliberately out of scope.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const RULES_DIR = join(ROOT, ".context", "rules");
const CLAUDE = join(ROOT, "CLAUDE.md");

const findings = [];
const note = (check, msg) => findings.push({ check, msg });
const read = (p) => readFileSync(p, "utf8");
const lineCount = (p) => read(p).split("\n").length - 1; // matches `wc -l`

// Matches `path/to/file.liquid` v1.2.3 (or .js) in a spec header. CSS pins use a
// description (no vX.Y.Z) and are skipped.
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

// ---- 1. CLAUDE.md tally ----
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

// ---- 2. colocation-hygiene ----
const CODE_DIRS = ["snippets", "blocks", "sections", "assets", "layout"];
for (const dir of CODE_DIRS) {
  const absDir = join(ROOT, dir);
  if (!existsSync(absDir)) continue;
  for (const specFile of readdirSync(absDir).filter((f) => f.endsWith(".spec.md"))) {
    const header = read(join(absDir, specFile)).split(/\n##\s/)[0];
    const seen = new Set();
    for (const [, rel, pinned] of header.matchAll(PIN_RE)) {
      const key = `${rel}|${pinned}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const abs = join(ROOT, rel);
      if (!existsSync(abs)) {
        note("colocation", `${dir}/${specFile}: pins \`${rel}\` v${pinned} — file not found`);
        continue;
      }
      const actual = fileVersion(abs);
      if (actual === null)
        note("colocation", `${dir}/${specFile}: pins \`${rel}\` v${pinned} — no version header in file`);
      else if (actual !== pinned)
        note("colocation", `${dir}/${specFile}: pins \`${rel}\` v${pinned} — file is v${actual}`);
    }
  }
}

// ---- 3. placement — no specs in the retired .context/specs/ location ----
const LEGACY_SPECS = join(ROOT, ".context", "specs");
if (existsSync(LEGACY_SPECS)) {
  const ALLOWED = new Set(["_template.md", "_spec-feedback.md"]);
  for (const f of readdirSync(LEGACY_SPECS).filter((f) => f.endsWith(".md"))) {
    if (!ALLOWED.has(f))
      note(
        "placement",
        `.context/specs/${f} — specs colocate beside code; author as <name>.spec.md beside the logic owner`,
      );
  }
}

// ---- report ----
if (findings.length === 0) {
  console.log("context-lint: clean ✓  (tally, colocation, placement)");
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
