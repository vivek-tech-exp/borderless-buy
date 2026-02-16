#!/usr/bin/env sh
set -eu

if [ "${SKIP_GITLEAKS:-0}" = "1" ]; then
  echo "[security] Skipping gitleaks scan (SKIP_GITLEAKS=1)."
  exit 0
fi

if ! command -v gitleaks >/dev/null 2>&1; then
  cat <<'EOF' >&2
[security] gitleaks is required but not installed.
Install it and retry:
  macOS: brew install gitleaks
  Linux: brew install gitleaks (or your package manager)
  Windows: scoop install gitleaks
Docs: https://github.com/gitleaks/gitleaks#installing
EOF
  exit 1
fi

MODE="${1:-staged}"

run_full_history_scan() {
  gitleaks git --no-banner --redact --exit-code 1 .
}

run_push_scan() {
  if UPSTREAM_REF="$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null)"; then
    BASE_COMMIT="$(git merge-base HEAD "$UPSTREAM_REF" 2>/dev/null || true)"
    if [ -n "$BASE_COMMIT" ]; then
      RANGE="$BASE_COMMIT..HEAD"
      if [ -z "$(git rev-list -n 1 "$RANGE" 2>/dev/null)" ]; then
        echo "[security] No outgoing commits to scan with gitleaks."
        return 0
      fi

      echo "[security] Running gitleaks on outgoing commits ($RANGE)..."
      gitleaks git --log-opts "$RANGE" --no-banner --redact --exit-code 1
      return 0
    fi
  fi

  echo "[security] No upstream detected. Running full-history gitleaks scan..."
  run_full_history_scan
}

case "$MODE" in
  staged)
    echo "[security] Running gitleaks on staged changes..."
    gitleaks git --staged --no-banner --redact --exit-code 1
    ;;
  push)
    run_push_scan
    ;;
  repo)
    echo "[security] Running gitleaks on full git history..."
    run_full_history_scan
    ;;
  *)
    echo "[security] Unknown mode: $MODE (expected: staged|push|repo)" >&2
    exit 2
    ;;
esac

echo "[security] gitleaks check passed."
