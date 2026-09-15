import test from "node:test";
import assert from "node:assert/strict";
import { isBareId, planProblems, registerProblems, renamePlan, rewrite, squashPlan } from "./decisions.mjs";

test("a squash closes every gap and leaves a contiguous register alone", () => {
  assert.deepEqual(
    [...squashPlan(["ADR-0001", "ADR-0006", "ADR-0009", "QC-001", "QC-002"])],
    [["ADR-0006", "ADR-0002"], ["ADR-0009", "ADR-0003"]],
  );
  assert.equal(squashPlan(["ADR-0001", "ADR-0002"]).size, 0);
});

test("a squash keeps the width each series was written at", () => {
  assert.deepEqual([...squashPlan(["QC-003"])], [["QC-003", "QC-001"]]);
});

test("a run shifting down does not clobber an id it has not moved yet", () => {
  const plan = squashPlan(["ADR-0001", "ADR-0002", "ADR-0003", "ADR-0005"]);
  assert.equal(rewrite("ADR-0005 then ADR-0003", plan), "ADR-0004 then ADR-0003");
});

test("a swap survives being written through itself", () => {
  const plan = renamePlan("ADR-0001=ADR-0002,ADR-0002=ADR-0001");
  assert.equal(rewrite("ADR-0001 and ADR-0002", plan), "ADR-0002 and ADR-0001");
});

test("a citation is rewritten only whole", () => {
  assert.equal(rewrite("ADR-0001 ADR-00012", new Map([["ADR-0001", "ADR-0009"]])), "ADR-0009 ADR-00012");
});

test("a plan naming an id the register does not define is refused", () => {
  assert.deepEqual(planProblems(renamePlan("ADR-0099=ADR-0001"), new Set(["ADR-0001"])), [
    "ADR-0099 is not a decision this repository defines",
    "ADR-0001 is already taken by a decision this plan does not move",
  ]);
});

test("a plan landing on an id that is not itself moving is refused", () => {
  const problems = planProblems(renamePlan("ADR-0002=ADR-0001"), new Set(["ADR-0001", "ADR-0002"]));
  assert.deepEqual(problems, ["ADR-0001 is already taken by a decision this plan does not move"]);
});

test("two ids landing on one are refused", () => {
  const defined = new Set(["ADR-0001", "ADR-0002", "ADR-0003"]);
  const problems = planProblems(renamePlan("ADR-0002=ADR-0009,ADR-0003=ADR-0009"), defined);
  assert.deepEqual(problems, ["ADR-0002 and ADR-0003 would both become ADR-0009"]);
});

test("a gap, an uncited decision and an undefined citation are each reported", () => {
  const sites = new Map([
    ["ADR-0001", [{ file: "docs/decisions.md" }, { file: "src/a.ts" }]],
    ["ADR-0003", [{ file: "docs/decisions.md" }]],
    ["ADR-0400", [{ file: "src/b.ts" }]],
  ]);
  const problems = registerProblems(new Set(["ADR-0001", "ADR-0003"]), sites, "docs/decisions.md");
  assert.deepEqual(problems, [
    { text: "ADR: 1 gap(s) below ADR-0003", fatal: true },
    { text: "ADR-0003: defined and never cited — delete it, or cite it", fatal: false },
    { text: "ADR-0400: cited and not defined in docs/decisions.md", fatal: true },
  ]);
});

test("a register with no gap, no orphan and no dangling citation reports nothing", () => {
  const sites = new Map([["ADR-0001", [{ file: "docs/decisions.md" }, { file: "src/a.ts" }]]]);
  assert.deepEqual(registerProblems(new Set(["ADR-0001"]), sites, "docs/decisions.md"), []);
});

test("an id is a lookup, and a rename pair that contains one is not", () => {
  assert.equal(isBareId("ADR-0001"), true);
  assert.equal(isBareId("ADR-0047=ADR-0027"), false);
  assert.equal(isBareId("see ADR-0001", undefined), false);
  assert.equal(isBareId("--squash"), false);
});

test("an uncited decision is reported and does not fail the check", () => {
  const sites = new Map([["ADR-0001", [{ file: "docs/decisions.md" }]]]);
  const problems = registerProblems(new Set(["ADR-0001"]), sites, "docs/decisions.md");
  assert.deepEqual(problems.map((problem) => problem.fatal), [false]);
});
