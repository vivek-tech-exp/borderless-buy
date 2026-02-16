#!/usr/bin/env sh
set -eu

if [ "${SKIP_SECURITY_AUDIT:-0}" = "1" ]; then
  echo "[security] Skipping npm audit (SKIP_SECURITY_AUDIT=1)."
  exit 0
fi

MODE="${1:-push}"

run_npm_audit() {
  if npm audit "$@"; then
    return 0
  fi

  cat <<'EOF' >&2
[security] npm audit failed.
This usually means vulnerabilities were found or the npm registry is unreachable.
If you're temporarily offline, retry later or bypass once with:
  SKIP_SECURITY_AUDIT=1 git commit -m "..."
  SKIP_SECURITY_AUDIT=1 git push
EOF
  exit 1
}

run_commit_audit() {
  STAGED_FILES="$(git diff --cached --name-only --diff-filter=ACDMRTUXB)"
  if ! printf '%s\n' "$STAGED_FILES" | grep -Eq '^(package-lock\.json|package\.json|npm-shrinkwrap\.json)$'; then
    echo "[security] No dependency manifest changes staged. Skipping pre-commit audit."
    return 0
  fi

  echo "[security] Running npm audit (prod deps, high+) before commit..."
  run_npm_audit --omit=dev --audit-level=high --package-lock-only
}

run_push_audit() {
  echo "[security] Running npm audit (all deps, high+) before push..."
  run_npm_audit --audit-level=high --package-lock-only
}

case "$MODE" in
  commit)
    run_commit_audit
    ;;
  push)
    run_push_audit
    ;;
  *)
    echo "[security] Unknown mode: $MODE (expected: commit|push)" >&2
    exit 2
    ;;
esac

echo "[security] Vulnerability audit check passed."
