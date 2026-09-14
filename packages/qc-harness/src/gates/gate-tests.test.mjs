import test from "node:test";
import assert from "node:assert/strict";
import { checkGatesAreTested } from "./gate-tests.mjs";

const checks = [{ path: "scripts/gate/tenant-rules.mjs", contents: "export function checkTenantRules() {}" }];

test("a gate no test names fails", () => {
  const problems = checkGatesAreTested(checks, []);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].rule, "unproven-gate");
});

test("a test naming the file stem is enough", () => {
  const tests = [{ path: "a.test.mjs", contents: 'import x from "./tenant-rules.mjs";' }];
  assert.deepEqual(checkGatesAreTested(checks, tests), []);
});

test("a test naming an exported function is enough", () => {
  const tests = [{ path: "a.test.mjs", contents: "checkTenantRules([], []);" }];
  assert.deepEqual(checkGatesAreTested(checks, tests), []);
});

test("a repository with no gates of its own has nothing to prove", () => {
  assert.deepEqual(checkGatesAreTested([], []), []);
});
