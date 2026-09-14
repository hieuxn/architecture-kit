import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaults, load, merge } from "./config.mjs";
import { rules } from "./eslint/index.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

// A switch naming a rule that no longer exists silently stops switching anything.
// This is the test that catches the next rename, not the last one.
test("every lint rule has a switch, and every switch names a rule", () => {
  assert.deepEqual(Object.keys(defaults.rules).sort(), Object.keys(rules).sort());
});

test("every gate has a switch, and every switch names a gate", () => {
  const files = readdirSync(path.join(here, "gates"))
    .filter((file) => file.endsWith(".mjs") && !file.endsWith(".test.mjs"))
    .map((file) => file.replace(/\.mjs$/, ""))
    .sort();
  assert.deepEqual(Object.keys(defaults.gates).sort(), files);
});

test("a user config overrides a key without dropping its siblings", () => {
  const merged = merge(defaults, { tenant: { column: "orgId" } });
  assert.equal(merged.tenant.column, "orgId");
  assert.equal(merged.tenant.tableFactory, defaults.tenant.tableFactory);
});

test("an array replaces rather than merges", () => {
  const merged = merge(defaults, { featureRoots: ["src/features"] });
  assert.deepEqual(merged.featureRoots, ["src/features"]);
});

test("a repository with no config file loads the reference layout", () => {
  const config = load(here);
  assert.deepEqual(config.featureRoots, defaults.featureRoots);
});
