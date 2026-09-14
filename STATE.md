# STATE

Both halves are built, and `quality-control-mono` now runs on them.

## What exists

| Path | Holds |
|---|---|
| `.claude-plugin/`, `hooks/`, `skills/`, `commands/` | the Claude Code plugin `architecture` |
| `packages/qc-harness/src/gates/` | 11 gates, each with its must-fail case |
| `packages/qc-harness/src/eslint/` | 10 rules, a preset, and the fixture suite |
| `packages/qc-harness/src/cli/` | `qc check｜init｜feature｜install-hooks｜config` |
| `packages/qc-harness/templates/` | decisions, architecture, enforcement, guards, performance, glossary, ui, CLAUDE.md, thresholds, git hook, CI |

`pnpm test` — 123 passing.

## Acceptance, passed

1. **`qc check` reproduces the old checker** on `quality-control-mono`'s real code: 30 feature
   folders, the same two tenant-predicate exemptions, same verdict. Only two wordings differ, both
   deliberate (`bff` → `edge`, a dropped citation the kit cannot make).
2. **The lint preset reproduces the old eslint config byte for byte** across the whole repository,
   compared back to back on one tree.
3. **A fresh empty repository** goes `qc init` → `qc feature` → green `qc check`.
4. **The hooks** no-op without `qc.config.json`, pass a good file, and return exit 2 with the
   finding on a bad one.

## Renames, deliberate

| was | is | why |
|---|---|---|
| `drizzle-only-in-resource` | `storage-only-in-resource` | the ORM is config |
| `headless-pipeline-no-react` | `headless-pipeline-no-view` | the view library is config |
| `disallowed-legacy` | `disallowed-flat-anatomy` | "legacy" is this repo's history |

`checkSelfContained(files, foreign)` takes the foreign-name list; it hardcoded one repository's
predecessor.

## Open

- **The dependency is a local file link.** `quality-control-mono` has
  `"@shawry/qc-harness": "file:../architecture-kit/packages/qc-harness"`, which only resolves on a
  machine with both checkouts side by side. Publish, or point at the git URL, before anyone else
  clones it.
- The kit repository has no remote and no CI of its own yet.
