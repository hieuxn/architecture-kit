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

## Installed and verified

`claude plugin marketplace add <this repo>` then `claude plugin install architecture` works.
The inventory loads as 7 skills and 2 hooks, ~479 tokens always-on. Verified against a real
repository: the stop gate runs and reports, the post-edit gate passes a clean file, and both
no-op where there is no `qc.config.json`. The installed plugin carries the package, so the
hooks' `${CLAUDE_PLUGIN_ROOT}/packages/qc-harness/src/cli/qc.mjs` path resolves.

A consuming repository therefore keeps no hook scripts of its own. It adds its own extra stop
step through `QC_STOP_EXTRA` in `.claude/settings.json`.

## Open

- **The dependency is a local file link.** `quality-control-mono` has
  `"architecture-harness": "file:../architecture-kit/packages/qc-harness"`, which only resolves on a
  machine with both checkouts side by side. Publish, or point at the git URL, before anyone else
  clones it. The plugin half needs no such step — it installs from this repo directly.
- No git remote yet. `.github/workflows/ci.yml` runs the suite and a from-nothing smoke test
  (`qc init` → `qc feature` → `qc check`) once one exists.


## Gate 12 — saga-tests

Added after the extraction. The two headless rules keep orchestration out of the view and the view
out of the pipeline; neither proves a workflow is ever *run* without one. This asserts every
declared saga is named by a test that imports no view module.

Its first version demanded the pipeline constant's own name and reported 42 of 42 sagas untested in
`quality-control-mono` — a false alarm. Those workflows are called through `run*` helpers that wrap
the pipeline, so the gate now follows that one indirection, the way `tenant-predicate` already
follows a named insert factory. The honest number is **6 of 42**, all in `rebar`.

A CLI gate was considered and rejected: asserting an entrypoint file exists passes on day one and
never fails again. When a CLI dispatcher exists, the gate worth writing is agreement between its
dispatch table and the set of declared sagas — the shape `public-routes` and `internal-routes`
already use.
