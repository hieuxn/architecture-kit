// Scaffold the documents and configuration a new repository needs before any gate
// can pass. The citations gate reads docs/decisions.md; without it, gate one fails
// on every file. So `init` is not a convenience — it is the gate's own precondition.

import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const templates = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../templates");

// Copied into the repository root. `decisions.examples.md` stays in the package: a new
// repository should not carry somebody else's domain decisions.
const FILES = [
  ["qc.config.json", "qc.config.json"],
  ["quality-thresholds.json", "quality-thresholds.json"],
  [".jscpd.json", ".jscpd.json"],
  ["docs/decisions.md", "docs/decisions.md"],
  ["docs/architecture.md", "docs/architecture.md"],
  ["docs/enforcement.md", "docs/enforcement.md"],
  ["docs/guards.md", "docs/guards.md"],
  ["docs/performance.md", "docs/performance.md"],
  ["docs/glossary.md", "docs/glossary.md"],
  ["docs/ui.md", "docs/ui.md"],
  ["githooks/pre-commit", ".githooks/pre-commit"],
  ["github/workflows/ci.yml", ".github/workflows/ci.yml"],
];

async function copyTemplate(from, to, force) {
  if (existsSync(to) && !force) return { to, status: "kept" };
  await mkdir(path.dirname(to), { recursive: true });
  await copyFile(from, to);
  return { to, status: existsSync(to) && force ? "overwritten" : "written" };
}

export async function runInit(config, args = []) {
  const force = args.includes("--force");
  const results = [];
  for (const [source, target] of FILES) {
    results.push(await copyTemplate(path.join(templates, source), path.join(config.root, target), force));
  }

  const hook = path.join(config.root, ".githooks/pre-commit");
  if (existsSync(hook)) await writeFile(hook, await readFile(hook, "utf8"), { mode: 0o755 });

  for (const { to, status } of results) {
    console.log(`${status.padEnd(11)} ${path.relative(config.root, to)}`);
  }

  const kept = results.filter((result) => result.status === "kept").length;
  if (kept > 0) console.log(`\n${kept} file(s) already existed and were left alone. --force overwrites.`);
  console.log(`
Next:
  1. Edit docs/decisions.md — delete what does not apply, add your own. Ids are stable;
     never renumber, because every citation points at a number.
  2. Edit docs/glossary.md and the per-surface table in docs/performance.md.
  3. Point qc.config.json at your layout if it differs from the reference. \`qc config\`
     prints what is in force.
  4. \`qc install-hooks\` to bind the pre-commit hook.
  5. \`qc check\`.`);
}
