import test from "node:test";
import assert from "node:assert/strict";
import { checkHeadlessPipelines } from "./headless-sagas.mjs";

test("a pure headless pipeline with no React imports passes", () => {
  const pure = [{ path: "frontend/src/features/photos/pipeline.ts", contents: "export function upload() {}" }];
  assert.deepEqual(checkHeadlessPipelines(pure), []);
});

test("a pipeline importing react fails and names headless-pipeline-no-view", () => {
  const withReact = [{ path: "frontend/src/features/photos/pipeline.ts", contents: "import * as React from 'react';" }];
  const problems = checkHeadlessPipelines(withReact);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].rule, "headless-pipeline-no-view");
});

test("a pipeline importing React hooks fails and names the rule", () => {
  const withHook = [{ path: "frontend/src/features/photos/pipeline.ts", contents: "import { useState } from 'preact';" }];
  const problems = checkHeadlessPipelines(withHook);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].rule, "headless-pipeline-no-hooks");
});

test("a UI trigger file importing React is allowed and passes", () => {
  const trigger = [{ path: "frontend/src/features/photos/trigger.tsx", contents: "import * as React from 'react';" }];
  assert.deepEqual(checkHeadlessPipelines(trigger), []);
});

test("the headless block and its banned view modules come from options", () => {
  const files = [{ path: "a/features/pins/flow.ts", contents: 'import { h } from "vue";' }];
  const problems = checkHeadlessPipelines(files, { block: "flow", viewModules: ["vue"] });
  assert.equal(problems.length, 1);
  assert.equal(problems[0].rule, "headless-pipeline-no-view");
});

test("a file that is not the configured block is not inspected", () => {
  const files = [{ path: "a/features/pins/pipeline.ts", contents: 'import { h } from "vue";' }];
  assert.deepEqual(checkHeadlessPipelines(files, { block: "flow", viewModules: ["vue"] }), []);
});
