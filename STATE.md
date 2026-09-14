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

- **P4a** `qc check` — the I/O layer, every path from config. `src/config.test.mjs` asserts the
  switch maps and the real rule and gate names agree, so the next rename cannot silently
  disable a check.

## Acceptance, already passing

`qc check` run against `quality-control-mono` reproduces that repo's own `scripts/check.mjs`
output exactly: 30 feature folders, the same two tenant-predicate exemptions, green. The only
diff is two deliberate wordings (`bff` → `edge`, and a dropped `QC-010` in a line the kit cannot
cite). The single-file fast path the post-edit hook calls works, and pointing `tenant.sqlColumn`
at a name the repo does not use turns the run red — so it is reading, not just passing.

## Next

**P4b** `qc init` / `qc feature` / `qc install-hooks`, **P5** templates, **P6** the plugin,
**P7** rewire `quality-control-mono` onto the kit.

## Watch

- A block comment cannot contain `*/` — a JSDoc holding a path glob closed the comment early once.
- P7 is the acceptance test: the kit reproducing this repo's green `pnpm check` on its real code.
