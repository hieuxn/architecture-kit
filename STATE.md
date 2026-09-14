# STATE

## Done

- **P0** repo skeleton, PLAN.md, git initialised.
- **P1** `src/config.mjs` — `qc.config.json` loader, deep-merged over defaults that reproduce the
  reference layout. A repo matching the reference writes no config at all.
- **P2** 10 lint rules in `src/eslint/rules/`, each reading its shape from ESLint options.
  Original fixture suite passes unchanged; one option case per knob.
- **P3** 11 gates in `src/gates/` with their tests. 117 tests pass (102 carried over unchanged,
  which is the evidence parameterisation changed no behaviour, plus 15 option cases).

## Renames, deliberate

The kit does not name a vendor or this repository's history.

| was | is | why |
|---|---|---|
| `drizzle-only-in-resource` | `storage-only-in-resource` | the ORM is config |
| `headless-pipeline-no-react` | `headless-pipeline-no-view` | the view library is config |
| `disallowed-legacy` | `disallowed-flat-anatomy` | "legacy" is this repo's history |

`checkSelfContained(files, foreign)` now takes the foreign-name list; it hardcoded this
repository's predecessor. A repo naming none has nothing to fail.

## Next

**P4** the CLI, **P5** templates, **P6** the plugin half, **P7** rewire `quality-control-mono`.

## Watch

- A block comment cannot contain `*/` — a JSDoc holding a path glob closed the comment early once.
- P7 is the acceptance test: the kit reproducing this repo's green `pnpm check` on its real code.
