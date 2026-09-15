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

Generated from the kit's own rule and gate metadata, so a renamed check cannot leave a stale row.
Read it as an index; the reasoning is under the headings that follow.

<!-- generated: rule-to-check. -->
<!-- /generated -->

Checks a repository owns rather than the kit:

| Rule | Check |
|---|---|
| Layer direction | `boundaries/element-types` |
| `domain` imports nothing | `boundaries/external` |
| No `any` | `@typescript-eslint/no-explicit-any` |
| Function, nesting, file size | `max-lines-per-function`, `max-depth`, `max-lines` |
| Cross-file duplication | `jscpd`, threshold from `quality-thresholds.json` |
| Every tenant-scoped table has a policy | codegen, from the `tenant-tables` generator |
| Two features cannot claim one path or schema | codegen, from the `contract-compose` generator |
| A generated registry is current | your codegen's `--check` |

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
