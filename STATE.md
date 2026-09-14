# STATE

## Done

- **P0** repo skeleton, PLAN.md, git initialised.
- **P1** `src/config.mjs` — `qc.config.json` loader, deep-merged over defaults that reproduce the
  reference layout. A repo matching the reference writes no config at all.
- **P2** all 10 lint rules moved to `src/eslint/rules/`, each reading its shape from ESLint options
  with defaults equal to the previous hardcoded behaviour.
  - `drizzle-only-in-resource` is renamed `storage-only-in-resource`: the kit does not name a vendor.
    The ORM module list is config.
  - `src/eslint/rules.test.mjs` — the original fixture suite passes unchanged, which is the evidence
    parameterisation changed no behaviour, plus one option case per knob.

## Next

**P3** — move the 14 gates from `quality-control-mono/scripts/gate/` with their tests.

## Watch

- `no-orchestration-in-trigger` previously reported from the second await onward; it now reports
  everything past `maxAwaits` (default 1), which is the same set. Confirmed by the original fixtures.
- Block comments cannot contain a `*/` — a JSDoc holding a path glob closed the comment early once
  already.
