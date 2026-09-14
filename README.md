# architecture-kit

The architecture, and everything that enforces it, extracted so a new repository starts with both.

Two artifacts live here. They install differently and cannot merge.

| Artifact | Install | Holds |
|---|---|---|
| Claude Code plugin `architecture` | `claude plugin install` | hooks, skills, slash commands |
| npm package `architecture-harness` | `pnpm add -D` | gates, lint rules, the `qc` CLI, doc templates |

The plugin's hooks call the package's CLI. Either half works without the other: the package is a
normal dev dependency, and the plugin's hooks no-op in any repository with no `qc.config.json`.

## Start a new repository

```bash
pnpm add -D architecture-harness
npx qc init            # decisions, architecture and enforcement docs, config, git hook, CI
npx qc install-hooks
npx qc feature orders  # scaffold a feature in the right anatomy
npx qc check
```

`qc init` is not a convenience. The citations gate reads `docs/decisions.md`; without that file the
first gate fails on every source file in the repository.

Then install the plugin so an agent is held to the same rules a human is:

```bash
claude plugin marketplace add <your-org>/architecture-kit
claude plugin install architecture
```

## What the architecture is

Vertical slices over a thin shared kernel. `infrastructure` → `adapters` → `application` →
`domain`, one legal direction, enforced by lint because the compiler cannot. A feature is a bounded
vertical slice (`index`, `schema`, `trigger`, `slices/`, `shared/`) or a flat pipeline for a narrow
single-operation feature. Tenant isolation is three independent levels. Keyset pagination only.
Guards for create, interactive update and offline replay are three different mechanisms and must not
be reconciled.

The whole register is `packages/qc-harness/templates/docs/decisions.md`, which `qc init` copies into
the repository. Ids are stable and never renumbered: every citation points at a number.

## What enforces it

Ten ESLint rules and eleven structural gates, each with a case that must fail — ADR-0032.

```
qc check          every structural gate
qc check <file>   the fast per-file path a post-edit hook takes
qc feature <name> scaffold a feature
qc init           scaffold the docs, config, hook and workflow
qc install-hooks  point git at .githooks
qc config         the configuration in force, after defaults merge
```

Lint is a preset, so a consumer's `eslint.config.mjs` is an import rather than a copy:

```js
import { preset } from "architecture-harness/preset";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import boundaries from "eslint-plugin-boundaries";
import sonarjs from "eslint-plugin-sonarjs";

export default [
  ...preset({
    plugins: { tseslint, boundaries, sonarjs },
    languageOptions: { parser: tsparser, ecmaVersion: 2023, sourceType: "module" },
  }),
];
```

## Configuration

Everything a gate or rule could hardcode is a key in `qc.config.json`, and every key has a default
that reproduces the reference layout — a repository that matches it writes no config at all. Run
`qc config` to print what is in force.

The keys that matter most when adopting: `featureRoots`, `paths`, `layers`, `tenant`, `apiClient`,
`presenters`, `anatomy`, and the `gates` and `rules` switches. Turn off what the repository
genuinely lacks; do not weaken a gate that applies.

`src/config.test.mjs` asserts the switch maps and the real rule and gate names agree, so a rename
cannot silently disable a check.

## Tests

```bash
pnpm test   # 10 rules, 11 gates, every knob, every must-fail case
```
