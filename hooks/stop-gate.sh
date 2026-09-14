#!/usr/bin/env bash
# The expensive pass. Refuses to end a turn while the repo is red.
set -uo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"
[ -f "$ROOT/qc.config.json" ] || exit 0
cd "$ROOT" || exit 0

# A fixed path in the system temp directory collides when two projects run at once.
LOGS=$(mktemp -d) || exit 0
trap 'rm -rf "$LOGS"' EXIT

QC="node ${CLAUDE_PLUGIN_ROOT}/packages/qc-harness/src/cli/qc.mjs"
FAIL=""

if [ -f "$ROOT/node_modules/.bin/tsc" ]; then
  npx tsc -b --pretty false >"$LOGS/tsc" 2>&1 || FAIL+="typecheck failed:\n$(tail -20 "$LOGS/tsc")\n"
fi
if [ -f "$ROOT/node_modules/.bin/eslint" ]; then
  npx eslint . --max-warnings 0 >"$LOGS/lint" 2>&1 || FAIL+="lint failed:\n$(tail -20 "$LOGS/lint")\n"
fi
$QC check >"$LOGS/struct" 2>&1 || FAIL+="structure failed:\n$(cat "$LOGS/struct")\n"

# Anything else this repository wants in the stop gate.
if [ -n "${QC_STOP_EXTRA:-}" ]; then
  eval "$QC_STOP_EXTRA" >"$LOGS/extra" 2>&1 || FAIL+="$QC_STOP_EXTRA failed:\n$(tail -20 "$LOGS/extra")\n"
fi

if [ -n "$FAIL" ]; then
  printf '%b' "$FAIL" >&2
  echo "The repo is red. Do not stop here — fix it. docs/enforcement.md." >&2
  exit 2
fi
exit 0
