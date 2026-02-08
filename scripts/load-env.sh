#!/usr/bin/env bash
# Load environment variables from .env.local into the current shell.
# Usage: source scripts/load-env.sh

ENV_FILE=".env.local"

# Resolve repository root if possible
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT="$(pwd)"
if command -v git >/dev/null 2>&1; then
  GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || true)
  if [ -n "$GIT_ROOT" ]; then
    REPO_ROOT="$GIT_ROOT"
  fi
fi

# Candidate locations (in order): cwd, repo root, script dir, script parent
CANDIDATES=("$REPO_ROOT/.env.local" "$(pwd)/.env.local" "$SCRIPT_DIR/.env.local" "$SCRIPT_DIR/../.env.local")
FOUND=""
for c in "${CANDIDATES[@]}"; do
  if [ -f "$c" ]; then
    FOUND="$c"
    break
  fi
done

if [ -z "$FOUND" ]; then
  echo "No .env.local found in any of: ${CANDIDATES[*]}" >&2
  return 1 2>/dev/null || exit 1
fi

ENV_FILE="$FOUND"

# Export all variables defined in the file. We use `set -a` so variables
# sourced from the file become exported automatically.
set -a
if [ -r "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
  echo "Loaded environment variables from $ENV_FILE"
else
  set +a
  echo "Cannot read $ENV_FILE" >&2
  return 1 2>/dev/null || exit 1
fi
