#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  "$ROOT_DIR/stop-dev.sh" >/dev/null 2>&1 || true
}

trap cleanup EXIT

printf 'Resetting workspace and starting Docker dev stack...\n'
"$ROOT_DIR/stop-dev.sh" --volumes >/dev/null 2>&1 || true
PYRITE_NO_TMUX=1 "$ROOT_DIR/run-dev.sh" >/dev/null

printf 'Waiting for app readiness...\n'
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:18100/api/auth/session" >/dev/null && curl -fsS "http://127.0.0.1:18110" >/dev/null; then
    break
  fi
  sleep 1
done

printf 'Ensuring Playwright browser is installed...\n'
(cd "$ROOT_DIR/src/pyrite-web" && npx playwright install chromium >/dev/null)

printf 'Running app test suite...\n'
(cd "$ROOT_DIR/src/pyrite-web" && npx playwright test -c "$ROOT_DIR/src/pyrite-web/playwright.app.config.ts")
