// One config, read by every gate and by the lint preset. A constant that named this
// repository's shape is a config key here. Defaults reproduce the reference layout, so a
// repo that adopts the reference layout writes no config at all.

import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const CONFIG_FILE = "qc.config.json";

export const defaults = {
  // Where features live. Every structural gate walks these.
  featureRoots: ["backend/src/features", "frontend/src/features"],
  // The path segment that marks a feature, and the one file that crosses its boundary.
  featureDir: "features",
  publicFile: "index",

  docs: {
    root: "docs",
    decisions: "docs/decisions.md",
    enforcement: "docs/enforcement.md",
  },

  // Citation ids the repository defines and the gates resolve.
  citations: {
    prefixes: ["ADR", "QC"],
    // Ids recognised inside comments but owned elsewhere: standards, requirement ids.
    external: ["REQ-[A-Z]{3}-\\d+", "T\\d+-\\d+", "D\\d+"],
  },

  thresholds: "quality-thresholds.json",

  tenant: {
    column: "tenantId",
    sqlColumn: "tenant_id",
    tableFactory: "pgTable",
    indexFactory: "index",
  },

  storage: {
    modules: ["drizzle-orm", "pg", "postgres"],
    // The blocks permitted to import a storage module.
    resourceFiles: ["resource.ts", "schema.ts"],
    // Something must bind the driver for a resource to have a pool. That path is exempt.
    driverBinding: "backend/src/infrastructure/db/",
  },

  // The one module permitted to call fetch or build a URL.
  apiClient: "platform/api-client.ts",

  // Files that may only present, never orchestrate.
  presenters: "frontend/src/features/*/trigger",

  // Names that must be registered scoped, never singleton.
  scopedSuffixes: ["Repository", "Saga", "UnitOfWork", "UnitOfWorkFactory"],

  anatomy: {
    // Bounded vertical slices.
    slice: {
      required: ["index.ts", "schema.ts", "trigger.ts"],
      sliceDir: "slices",
      sharedDir: "shared",
      sharedFiles: ["types.ts", "queries.ts", "guards.ts", "runner.ts"],
    },
    // The flat pipeline anatomy.
    block: {
      required: ["index.ts", "trigger.ts", "pipeline.ts", "resource.ts"],
      optional: ["branch.ts", "fragment.ts", "ledger.ts", "record.ts"],
    },
  },

  // Every gate and lint rule is switchable. Ship all; a repo turns off what it lacks.
  gates: {
    "eight-blocks": true,
    citations: true,
    "registry-agreement": true,
    "sql-identifiers": true,
    "tenant-predicate": true,
    "tenant-tables": true,
    "claimed-requirements": true,
    "public-routes": true,
    "internal-routes": true,
    "contract-compose": true,
    "headless-sagas": true,
  },

  rules: {
    "no-number-in-comment": true,
    "no-cross-feature-internals": true,
    "no-offset-pagination": true,
    "no-orchestration-in-trigger": true,
    "no-status-literal": true,
    "scoped-repository": true,
    "drizzle-only-in-resource": true,
    "tenant-scoped-table": true,
    "signal-last-param": true,
    "no-raw-fetch": true,
  },

  // Layer names and their legal import direction. The kit ships the reference set;
  // a repo with different layers replaces the whole block.
  layers: {
    include: ["backend/src/**/*.ts", "packages/domain/src/**/*.ts"],
    elements: [
      { type: "domain", pattern: "packages/domain/src/**" },
      { type: "application", pattern: "backend/src/application/**" },
      { type: "adapters", pattern: "backend/src/adapters/**" },
      { type: "infrastructure", pattern: "backend/src/infrastructure/**" },
      { type: "feature", pattern: "backend/src/features/*/**" },
    ],
    allow: {
      domain: ["domain"],
      application: ["domain", "application"],
      adapters: ["domain", "application", "adapters"],
      infrastructure: ["domain", "application", "adapters", "infrastructure"],
      feature: ["domain", "application", "adapters", "feature"],
    },
    external: [
      { from: ["domain"], disallow: ["*"] },
      { from: ["application"], disallow: ["*"], allow: ["zod"] },
    ],
  },

  // Extra pipeline steps a repo composes in. The CLI never hardcodes a project's chain.
  pipeline: [],

  ignores: ["**/dist/**", "**/node_modules/**", "**/*.tsbuildinfo"],
};

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Later wins. An array replaces; an object merges key by key. */
export function merge(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) return override ?? base;
  const out = { ...base };
  for (const [key, value] of Object.entries(override)) {
    out[key] = isPlainObject(value) && isPlainObject(base[key]) ? merge(base[key], value) : value;
  }
  return out;
}

/** Read `qc.config.json` from `root`, merged over the defaults. Absent is legal. */
export function load(root = process.cwd()) {
  const file = path.join(root, CONFIG_FILE);
  const user = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const config = merge(defaults, user);
  config.root = root;
  return config;
}

/** Thresholds live in their own registry so lint and docs cite one number. */
export function thresholds(config) {
  const file = path.join(config.root ?? process.cwd(), config.thresholds);
  if (!existsSync(file)) return {};
  return createRequire(import.meta.url)(file).gates ?? {};
}

export function enabled(map, id) {
  return map[id] !== false;
}
