# PLAN — architecture-kit

Extract the agent harness + architecture of `quality-control-mono` into a reusable kit.

Source repo: `~/Documents/GitHub/quality-control-mono` (branch `chore/local-env-single-file`).

## Two artifacts, one repo

| Artifact | Installs how | Holds |
|---|---|---|
| Claude Code plugin `architecture` | `claude plugin install` | hooks wiring, skills (rules), slash commands |
| npm package `@shawry/qc-harness` | `pnpm add -D` | gates, eslint rules, CLI, doc templates |

The plugin's hooks shell out to the package's CLI. They cannot merge: different install mechanisms.

## The real work is parameterization, not copying

Every gate hardcodes this repo's shape. Each file is parameterized **as it moves**, reading
`qc.config.json` instead of a constant. Known hardcodes:

- `check.mjs` — `ROOTS = ["backend/src/features","frontend/src/features"]`
- `citations.mjs` — requires `docs/decisions.md` with ADR/QC ids
- `eight-blocks.mjs` — ADR-0047 block filenames + ADR-0054 slice taxonomy
- `no-raw-fetch` — `platform/api-client.ts`; `drizzle-only-in-resource` — Drizzle + `resource.ts`
- `sql-identifiers` / `public-routes` / `internal-routes` / `contract-compose` — backend/bff/workers split
- `eslint.config.mjs` — relative `require("./quality-thresholds.json")`
- both hooks — `cd ../..` + `node scripts/check.mjs`; fixed `/tmp/qc-*.log` (two projects clobber)

Every gate and rule is individually toggleable in config. Ship all, default preset on.
A new project turns off what does not apply.

## Phases

- [ ] **P0** repo skeleton, PLAN/STATE
- [ ] **P1** `qc.config.json` schema + loader with defaults
- [ ] **P2** 11 eslint rules + `rules.test.mjs` → `src/eslint/`, parameterized
- [ ] **P3** 14 gates + tests → `src/gates/`, parameterized
- [ ] **P4** CLI `qc`: `check`, `gate:test`, `init`, `gen:feature`, `codegen`, `install-hooks`
- [ ] **P5** templates: `docs/{decisions,architecture,enforcement,guards,glossary,performance}.md`,
      `CLAUDE.md`, `.githooks/pre-commit`, `ci.yml`, `quality-thresholds.json`, `.jscpd.json`
- [ ] **P6** plugin half: `plugin.json`, `marketplace.json`, `hooks/hooks.json`, skills, commands
- [ ] **P7** rewire `quality-control-mono` onto the kit — `pnpm check` green, originals still present
- [ ] **P8** delete originals there (QC-008: rewritten in place, no shims)

## Acceptance

P7 is the real test: the extracted package reproducing this repo's current green state on this
repo's real code. `node --test` inside the kit is the per-gate regression suite (ADR-0032 means
every gate already ships its own failing case).

## Do not carry

- `scripts/gate/tenant-predicate.mjs.orig` — merge artifact
- `test:headless`, `contracts:lint` — project-specific (redocly, `packages/testing`). The CLI
  composes its pipeline from config; it does not hardcode this repo's `pnpm check` chain.
