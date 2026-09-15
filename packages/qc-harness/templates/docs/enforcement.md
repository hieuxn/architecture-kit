# Enforcement — QC-007

A rule that cannot name its check is deleted or converted into one.

| Layer | Mechanism |
|---|---|
| Types | Features are built only through `define*`. A wrong shape does not compile |
| Generators | `qc feature` scaffolds; codegen writes every shared registry. The right thing is cheaper than the wrong thing |
| Lint | `error`, thresholds imported from `quality-thresholds.json` |
| Hooks | the agent's post-edit gate (fast, per file) and stop gate (full, blocks a red turn), plus `.githooks/pre-commit` |
| CI | Required for merge |

Every gate and every rule is switchable in `qc.config.json` under `gates` and `rules`. Ship all;
turn off what this repository does not have. A gate whose input path does not exist disables itself.

## Rule to check

| Rule | Check |
|---|---|
| Layer direction | `boundaries/element-types` |
| `domain` imports nothing | `boundaries/external` |
| Only `index` crosses a feature | `qc/no-cross-feature-internals` |
| Storage only in the resource block | `qc/storage-only-in-resource` |
| Repositories and sagas are scoped | `qc/scoped-repository` |
| No hand-written status | `qc/no-status-literal` |
| Keyset pagination only | `qc/no-offset-pagination` |
| Every business table carries the tenant | `qc/tenant-scoped-table` |
| Cancellation is a parameter | `qc/signal-last-param` |
| One module calls fetch | `qc/no-raw-fetch` |
| No number in a comment | `qc/no-number-in-comment` |
| No `any` | `@typescript-eslint/no-explicit-any` |
| Function, nesting, file size | `max-lines-per-function`, `max-depth`, `max-lines` |
| Cross-file duplication | `jscpd`, threshold from `quality-thresholds.json` |
| UI triggers are thin presenters | `qc/no-orchestration-in-trigger` |
| Pipelines remain pure and headless | `qc check` (headless-sagas) |
| Every workflow runs without a view | `qc check` (saga-tests). A saga must be named by a test that imports no view module; a runner that calls it counts |
| Feature anatomy | `qc check` (eight-blocks) |
| Cited ids and doc paths resolve | `qc check` (citations) |
| No reference to another repository | `qc check` (citations, `foreign`) |
| Every tenant-scoped table has a policy | codegen, from the `tenant-tables` generator |
| Two features cannot claim one path or schema | codegen, from the `contract-compose` generator |
| A generated registry is current | your codegen's `--check` |
| A query names a column a migration declares | `qc check` (sql-identifiers) |
| A feature's SQL reads only its own tables | `qc check` (sql-identifiers) — the import rule cannot see a table name |
| Every statement on a business table filters on the tenant | `qc check` (tenant-predicate). An exemption is a marked comment carrying its reason, printed on every run |
| The edge opens exactly the routes the api serves without a session | `qc check` (public-routes) |
| Every path a worker posts to is a route the api serves | `qc check` (internal-routes) |
| A claimed requirement names a test | `qc check` (claimed-requirements) |
| An idempotency key is a durable id | `qc/durable-idempotency-key` |
| No supersession trail | `qc/no-supersession-trail` |
| A repository's own gates are tested | `qc check` (gate-tests) |
| The audit log is append-only | `qc check` (audit-append-only) |
| A value written twice agrees with its registry | `qc check` (registry-agreement) |
| Every rule names a check, and every check is named | `qc check` (enforcement-map) |

## File length

A block is one file, and the gate is `filelength` in `quality-thresholds.json`. Blanks and comments
do not count, so a file is never shortened by deleting the reasoning — that reasoning is often the
most valuable thing in the file.

Set the number by measuring, not by taste. Apply the anatomy repo-wide first: move every genuinely
reused step into `shared/`, every invariant into its aggregate. Then see what is left. What remains
is usually not misplaced code — a long block is a feature that owns several tables, and the only
thing that shortens it is splitting the feature. Some of those splits are clean; some are refused by
the architecture, because a guard must run in the same transaction as the write it guards. Buying a
smaller number with a cross-feature call in place of an in-transaction authorize step is a bad trade,
so the number is the thing that gives.

**Never lower this gate ahead of the work it demands**: a gate that lands first blocks only the
person doing that work.

An oversized block has two architectural answers: extract genuinely reused steps into `shared/`
(ADR-0054) or `fragment.ts` (ADR-0047), or split the feature.

## Comments

Code carries the meaning. A comment exists only where it cannot.

- **One line.** Reasoning that wants a paragraph is a decision: give it an id and cite that.
- No banners, no commented-out code, no "what" comments. A JSDoc `@param` line is not prose.
- Cite a decision — `ADR-0052`, `QC-008`, `docs/guards.md`. Never restate one.
- Never write a number or quantity threshold (neither digits nor spelled-out words). Cite the
  registry or the doc that owns it. Citation ids are the exception.

Prose quality is a review concern, deliberately not a rule: a second rule demanding a citation on
every comment would fight the numeric one, and each false positive costs an agent round-trip.

## Gates are proven

Every rule and gate ships a case that **must fail** — ADR-0032.
