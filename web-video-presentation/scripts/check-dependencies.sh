#!/usr/bin/env bash
# Compatibility entry point. Inventory only; no LAN probes or npm installs.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
PROJECT=""
PROJECT_SET=false
# Keep at least one element: macOS Bash 3.2 + nounset rejects empty-array expansion.
ARGS=(--mode=inventory)
while [[ $# -gt 0 ]]; do
  case "$1" in
    --json) ARGS+=(--json) ;;
    --legacy-resume) ARGS+=(--legacy-resume) ;;
    --project=*)
      [[ "$PROJECT_SET" == false ]] || { echo 'x Duplicate --project' >&2; exit 1; }
      PROJECT_SET=true
      PROJECT="${1#--project=}"; [[ -n "$PROJECT" ]] || { echo 'x --project requires a path' >&2; exit 1; } ;;
    --project)
      [[ "$PROJECT_SET" == false ]] || { echo 'x Duplicate --project' >&2; exit 1; }
      PROJECT_SET=true
      shift
      [[ $# -gt 0 && "$1" != --* ]] || { echo 'x --project requires a path' >&2; exit 1; }
      PROJECT="$1" ;;
    --install-project)
      echo 'x Installation was removed from this read-only checker. First select/validate the project and obtain authorization for npm ci, its registry and exact project/.cache/npm path; see references/WORKSPACE-SETUP.md.' >&2
      exit 1 ;;
    -h|--help)
      echo 'Read-only: check-dependencies.sh [--json] [--project <existing-generated-project> [--legacy-resume]]'
      echo 'New workspace: bootstrap-preflight.sh --mode=new --project-root <explicit-selected-dir> [--json]'
      exit 0 ;;
    *) echo "x Unsupported argument: $1" >&2; exit 1 ;;
  esac
  shift
done
if [[ -n "$PROJECT" ]]; then
  ARGS[0]=--mode=resume
  exec bash "$ROOT/scripts/bootstrap-preflight.sh" "${ARGS[@]}" --project-root "$PROJECT"
fi
exec bash "$ROOT/scripts/bootstrap-preflight.sh" "${ARGS[@]}"
