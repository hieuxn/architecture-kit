// The right thing is the cheapest thing. docs/enforcement.md.
// An agent that runs the generator cannot produce a wrong anatomy.
//
// The emitted files import their runtime from `kernelModule` in qc.config.json, never
// from this package: the kit prescribes the shape and ships no runtime to depend on.

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const NAME = /^[a-z][a-z0-9-]*$/;

function names(name) {
  return {
    name,
    camel: name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),
    pascal: name.replace(/(^|-)([a-z])/g, (_, __, letter) => letter.toUpperCase()),
    snake: name.replace(/-/g, "_"),
    upper: name.replace(/-/g, "_").toUpperCase(),
  };
}

function sliceFiles(id, config) {
  const kernel = config.kernelModule;
  const { name, camel, pascal, snake, upper } = id;
  const tenant = config.tenant;
  return {
    "index.ts": `import { defineIndex } from "${kernel}";
import { trigger } from "./trigger.js";

export const ${camel} = defineIndex({
  name: "${name}",
  surface: {},
  resourceTypes: ["${name}"],
  invalidation: [],
  trigger,
});
`,
    "schema.ts": `// Storage schema for ${name}. ADR-0054, docs/architecture.md.

import { ${tenant.tableFactory}, text, timestamp } from "${config.storage.modules[0]}/pg-core";

export const ${camel}Table = ${tenant.tableFactory}("${snake}", {
  id: text("id").primaryKey(),
  ${tenant.column}: text("${tenant.sqlColumn}").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
`,
    "trigger.ts": `// Thin composition point: a route names a slice handler and nothing else.

import { defineTrigger } from "${kernel}";
import { create${pascal} } from "./slices/create.js";

export const trigger = defineTrigger({
  routes: [
    { method: "POST", path: "/v1/${name}", auth: "tenant", handler: create${pascal} },
  ],
});
`,
    "shared/types.ts": `// Row types and the column projection every slice reads through.

export type ${pascal}Row = {
  id: string;
  ${tenant.column}: string;
  createdAt: string;
  updatedAt: string;
};

export const ${upper}_COLUMNS = \`id, ${tenant.sqlColumn} as "${tenant.column}", created_at as "createdAt", updated_at as "updatedAt"\`;
`,
    "slices/create.ts": `// One operation: validate, run the pipeline, write. docs/architecture.md.

import { definePipeline } from "${kernel}";
import { ${upper}_COLUMNS, type ${pascal}Row } from "../shared/types.js";

type Create${pascal}State = {
  ${tenant.column}: string;
  row?: ${pascal}Row;
};

export const create${pascal}Pipeline = definePipeline<Create${pascal}State>({
  name: "create-${name}",
  steps: [],
});

export async function create${pascal}() {
  throw new Error("not implemented");
}
`,
  };
}

function flatFiles(id, config) {
  const kernel = config.kernelModule;
  const { name, camel, snake, upper } = id;
  const tenant = config.tenant;
  return {
    "index.ts": `import { defineIndex } from "${kernel}";
import { trigger } from "./trigger.js";

export const ${camel} = defineIndex({
  name: "${name}",
  surface: {},
  resourceTypes: ["${name}"],
  invalidation: [],
  trigger,
});
`,
    "trigger.ts": `import { defineTrigger } from "${kernel}";

export const trigger = defineTrigger({ routes: [] });
`,
    "pipeline.ts": `// Ordered named steps. Headless: no view library reaches in here. QC-010.

import { definePipeline } from "${kernel}";

export const ${camel}Pipeline = definePipeline({ name: "${name}", steps: [] });
`,
    "resource.ts": `// The only block that touches storage. ADR-0047.

import { ${tenant.tableFactory}, text, timestamp } from "${config.storage.modules[0]}/pg-core";

export const ${camel}Table = ${tenant.tableFactory}("${snake}", {
  id: text("id").primaryKey(),
  ${tenant.column}: text("${tenant.sqlColumn}").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ${upper}_COLUMNS = \`id, ${tenant.sqlColumn} as "${tenant.column}", created_at as "createdAt"\`;
`,
  };
}

export async function runScaffold(config, args = []) {
  const name = args.find((arg) => !arg.startsWith("-"));
  if (!name || !NAME.test(name)) {
    console.error("usage: qc feature <domain-name> [--flat] [--root <path>]");
    console.error("The name is the full domain word, never a code.");
    process.exitCode = 1;
    return;
  }

  const flat = args.includes("--flat");
  const rootArg = args[args.indexOf("--root") + 1];
  const root = args.includes("--root") && rootArg ? rootArg : config.paths.serverFeatures;
  const dir = path.join(config.root, root, name);

  if (existsSync(dir)) {
    console.error(`${path.relative(config.root, dir)} already exists.`);
    process.exitCode = 1;
    return;
  }

  const id = names(name);
  const files = flat ? flatFiles(id, config) : sliceFiles(id, config);
  for (const [file, contents] of Object.entries(files)) {
    const target = path.join(dir, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
    console.log(`written     ${path.relative(config.root, target)}`);
  }
  console.log(`
${flat ? "Flat pipeline" : "Bounded vertical slice"} anatomy. An empty block is a review finding:
fill each file or delete the ones this feature does not need, then \`qc check\`.`);
}
