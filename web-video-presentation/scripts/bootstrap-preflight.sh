#!/usr/bin/env bash
# No installation fallback: the chosen workspace must remain untouched.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
if ! command -v node >/dev/null 2>&1; then
  echo 'Workspace preflight blocked: Node.js is missing. Select a supported Node installer/portable target and obtain authorization; no files were created or tools downloaded.' >&2
  exit 2
fi
exec node "$ROOT/scripts/workspace-preflight.mjs" "$@"
