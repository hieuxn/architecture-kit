import { strict as assert } from "node:assert";
import { test } from "node:test";
import { denyOutput, globToRegExp, isAllowed } from "./work-order-guard.mjs";

test("a path under a declared glob is allowed", () => {
  assert.equal(isAllowed("frontend/src/platform/ui/button.tsx", ["frontend/src/platform/**"]), true);
});

test("a path outside every declared glob is refused", () => {
  assert.equal(isAllowed("backend/src/main.ts", ["frontend/src/platform/**"]), false);
});

test("no declared paths means no restriction", () => {
  assert.equal(isAllowed("anything/at/all.ts", []), true);
});

test("a single star does not cross a directory boundary", () => {
  assert.equal(isAllowed(".github/workflows/nested/ci.yml", [".github/workflows/*.yml"]), false);
  assert.equal(isAllowed(".github/workflows/ci.yml", [".github/workflows/*.yml"]), true);
});

test("the deny reason names the file and the declared paths", () => {
  const output = denyOutput("backend/src/main.ts", ["frontend/src/platform/**"]);
  assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /backend\/src\/main\.ts/);
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /frontend\/src\/platform/);
});

test("globToRegExp escapes a regex metacharacter in a literal path segment", () => {
  assert.equal(globToRegExp("docs/a.b/**").test("docs/aXb/index.md"), false);
  assert.equal(globToRegExp("docs/a.b/**").test("docs/a.b/index.md"), true);
});
