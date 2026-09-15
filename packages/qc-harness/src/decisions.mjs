// Renumbering a decision means rewriting every citation of it, or leaving a dangling pointer.
// Pure, like a gate: what moves and what the text becomes. The CLI does the walking.

import { citationPattern } from "./gates/citations.mjs";

export function sequences(ids) {
  const bySeries = new Map();
  for (const id of ids) {
    const at = id.lastIndexOf("-");
    const number = id.slice(at + 1);
    const series = bySeries.get(id.slice(0, at)) ?? [];
    series.push({ id, number: Number(number), width: number.length });
    bySeries.set(id.slice(0, at), series);
  }
  for (const series of bySeries.values()) series.sort((a, b) => a.number - b.number);
  return bySeries;
}

/** Renumbered from one in the order the rows stand, so which decision came first survives. */
export function squashPlan(defined) {
  const plan = new Map();
  for (const [prefix, series] of sequences(defined)) {
    series.forEach((entry, index) => {
      const next = prefix + "-" + String(index + 1).padStart(entry.width, "0");
      if (next !== entry.id) plan.set(entry.id, next);
    });
  }
  return plan;
}

export function renamePlan(spec) {
  const plan = new Map();
  for (const pair of spec.split(",")) {
    const [from, to] = pair.split("=").map((half) => half.trim());
    if (!from || !to) throw new Error(`rename wants OLD=NEW, got "${pair}"`);
    plan.set(from, to);
  }
  return plan;
}

/** A plan is refused whole rather than applied in part. */
export function planProblems(plan, defined) {
  const problems = [];
  const landing = new Map();
  for (const [from, to] of plan) {
    if (!defined.has(from)) problems.push(`${from} is not a decision this repository defines`);
    if (defined.has(to) && !plan.has(to)) {
      problems.push(`${to} is already taken by a decision this plan does not move`);
    }
    const other = landing.get(to);
    if (other !== undefined) problems.push(`${other} and ${from} would both become ${to}`);
    landing.set(to, from);
  }
  return problems;
}

/** One pass over one alternation: every position is visited once, so a swap cannot collapse. */
export function rewrite(contents, plan) {
  if (plan.size === 0) return contents;
  const alternation = [...plan.keys()].map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return contents.replaceAll(new RegExp(`\\b(?:${alternation})\\b`, "g"), (id) => plan.get(id) ?? id);
}

/** `ADR-0001` is a lookup; `ADR-0001=ADR-0002` merely contains one and is not. */
export function isBareId(text, prefixes) {
  const found = text.match(citationPattern(prefixes));
  return found?.length === 1 && found[0] === text;
}

export function citationsIn(contents, prefixes) {
  const pattern = citationPattern(prefixes);
  const found = [];
  for (const [index, text] of contents.split("\n").entries()) {
    for (const id of text.match(pattern) ?? []) found.push({ id, line: index + 1, text: text.trim() });
  }
  return found;
}

/**
 * A row in the register is not a citation of itself, so `decisionsPath` never counts as a use.
 *
 * `fatal` separates what is wrong from what wants a person: a gap and a dangling citation are
 * defects, but a decision nobody cites may simply be enforced by absence — deleting one to satisfy
 * a check would be the check bending the work.
 *
 * @returns {{text: string, fatal: boolean}[]}
 */
export function registerProblems(defined, sites, decisionsPath) {
  const problems = [];
  for (const [prefix, series] of sequences(defined)) {
    const highest = series[series.length - 1];
    const missing = [];
    for (let number = 1; number <= highest.number; number += 1) {
      if (!series.some((entry) => entry.number === number)) missing.push(number);
    }
    if (missing.length > 0) {
      problems.push({ text: `${prefix}: ${missing.length} gap(s) below ${highest.id}`, fatal: true });
    }
  }
  for (const id of [...defined].sort()) {
    const uses = (sites.get(id) ?? []).filter((site) => site.file !== decisionsPath);
    if (uses.length === 0) {
      problems.push({ text: `${id}: defined and never cited — delete it, or cite it`, fatal: false });
    }
  }
  for (const id of [...sites.keys()].sort()) {
    if (!defined.has(id)) {
      problems.push({ text: `${id}: cited and not defined in ${decisionsPath}`, fatal: true });
    }
  }
  return problems;
}
