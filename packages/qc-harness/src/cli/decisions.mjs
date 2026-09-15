// `qc decisions` — where every id is cited, and how to renumber one without breaking a citation.

import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { definedIds } from "../gates/citations.mjs";
import {
  citationsIn,
  isBareId,
  planProblems,
  registerProblems,
  renamePlan,
  rewrite,
  squashPlan,
} from "../decisions.mjs";

const run = promisify(execFile);

// Generated output is rewritten from its own input, so a rename there is undone by the next run.
const GENERATED = /\.generated\.[^.]+$/;
const BINARY = /\.(png|jpe?g|gif|webp|ico|pdf|zip|woff2?|ttf|lock)$/i;

export const USAGE = `qc decisions — where every decision id is cited, and how to renumber one

  qc decisions                what is cited where, and what is wrong with the register
  qc decisions ADR-0054       every citation of one id, with its line
  qc decisions --check        exit 1 on a gap, an uncited id, or an undefined one
  qc decisions --squash       close every gap: rewrite the register and every citation
  qc decisions --rename A=B,C=D

  --dry-run  print what would change and write nothing
  --force    run against a dirty tree`;

/** git's own list: exact, already honouring .gitignore, and never node_modules. */
async function tracked(root) {
  const { stdout } = await run("git", ["ls-files", "-z"], { cwd: root, maxBuffer: 64 * 1024 * 1024 });
  return stdout.split("\0").filter((name) => name !== "" && !BINARY.test(name));
}

async function scan(config) {
  const prefixes = config.citations.prefixes;
  const sites = new Map();
  const generated = new Map();
  for (const file of await tracked(config.root)) {
    const contents = await readFile(path.join(config.root, file), "utf8").catch(() => null);
    if (contents === null) continue;
    const target = GENERATED.test(file) ? generated : sites;
    for (const found of citationsIn(contents, prefixes)) {
      const at = target.get(found.id) ?? [];
      at.push({ file, line: found.line, text: found.text });
      target.set(found.id, at);
    }
  }
  const register = await readFile(path.join(config.root, config.docs.decisions), "utf8");
  return { sites, generated, defined: definedIds(register, { prefixes }) };
}

async function apply(config, plan, sites) {
  const touched = new Set();
  for (const [from] of plan) for (const site of sites.get(from) ?? []) touched.add(site.file);
  for (const file of [...touched].sort()) {
    const full = path.join(config.root, file);
    await writeFile(full, rewrite(await readFile(full, "utf8"), plan));
  }
  return touched;
}

function usesOf(sites, id, decisionsPath) {
  return (sites.get(id) ?? []).filter((site) => site.file !== decisionsPath);
}

export async function runDecisions(config, args) {
  const flag = (name) => args.includes(name);
  const value = (name) => (args.indexOf(name) === -1 ? undefined : args[args.indexOf(name) + 1]);
  if (flag("--help")) {
    console.log(USAGE);
    return 0;
  }

  const { sites, generated, defined } = await scan(config);
  const decisionsPath = config.docs.decisions;

  const one = args.find((arg) => isBareId(arg, config.citations.prefixes));
  if (one) {
    const uses = sites.get(one) ?? [];
    console.log(`${one} — ${uses.length} citation(s)${defined.has(one) ? "" : "  [NOT DEFINED]"}`);
    for (const site of uses) console.log(`  ${site.file}:${site.line}  ${site.text.slice(0, 110)}`);
    for (const site of generated.get(one) ?? []) console.log(`  (generated) ${site.file}:${site.line}`);
    return 0;
  }

  const plan = flag("--squash")
    ? squashPlan(defined)
    : value("--rename")
      ? renamePlan(value("--rename"))
      : null;

  if (plan === null) {
    const problems = registerProblems(defined, sites, decisionsPath);
    const rows = [...defined]
      .map((id) => ({ id, uses: usesOf(sites, id, decisionsPath).length }))
      .sort((a, b) => b.uses - a.uses || a.id.localeCompare(b.id));
    console.log(`${defined.size} decision(s), ${rows.reduce((sum, row) => sum + row.uses, 0)} citation(s)\n`);
    for (const row of rows) console.log(`  ${row.id}  ${String(row.uses).padStart(4)}`);
    if (problems.length > 0) {
      console.log("");
      for (const problem of problems) console.log(`  ${problem.fatal ? "!" : "-"} ${problem.text}`);
    }
    return flag("--check") && problems.some((problem) => problem.fatal) ? 1 : 0;
  }

  const refusals = planProblems(plan, defined);
  if (refusals.length > 0) {
    for (const refusal of refusals) console.error(`FAIL decisions    ${refusal}`);
    return 1;
  }
  if (plan.size === 0) {
    console.log("OK  decisions     no gaps to close");
    return 0;
  }
  if (!flag("--force") && !flag("--dry-run")) {
    const { stdout } = await run("git", ["status", "--porcelain"], { cwd: config.root });
    if (stdout.trim() !== "") {
      console.error("FAIL decisions    dirty tree. This touches many files at once; commit or stash");
      console.error("                  first so it stays one revertible change. --force overrides.");
      return 1;
    }
  }

  for (const [from, to] of plan) console.log(`  ${from} -> ${to}   ${(sites.get(from) ?? []).length} citation(s)`);
  const stale = [...plan.keys()].filter((from) => generated.has(from));
  if (stale.length > 0) console.log(`\n  also in generated output: ${stale.join(", ")} — regenerate after this`);

  if (flag("--dry-run")) {
    const files = new Set();
    for (const [from] of plan) for (const site of sites.get(from) ?? []) files.add(site.file);
    console.log(`\n  ${files.size} file(s) would change. Nothing written.`);
    return 0;
  }

  const touched = await apply(config, plan, sites);
  console.log(`\nOK  decisions     ${plan.size} id(s) renumbered across ${touched.size} file(s)`);
  return 0;
}
