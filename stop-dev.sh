#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED_DIR="$ROOT_DIR/dev/duck-vault"
WORKSPACE_DIR="$ROOT_DIR/.dev-workspace"
WORKSPACE_VAULT_DIR="$WORKSPACE_DIR/duck-vault"
LOGS_DIR="$ROOT_DIR/logs"
DEV_LOG_DIR="$LOGS_DIR/dev"
STOP_LOG_FILE="$DEV_LOG_DIR/stop-dev.log"
SESSION_NAME="pyrite-dev"
COMPOSE_FILE="$ROOT_DIR/compose.dev.yml"

RESET_VOLUMES=false

if [[ "${1:-}" == "--volumes" ]]; then
  RESET_VOLUMES=true
fi

mkdir -p "$DEV_LOG_DIR"
exec > >(tee "$STOP_LOG_FILE") 2>&1

printf 'Stopping Docker dev stack...\n'
docker compose -f "$COMPOSE_FILE" down --remove-orphans

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  printf 'Closing tmux session %s...\n' "$SESSION_NAME"
  tmux kill-session -t "$SESSION_NAME"
fi

if [[ "$RESET_VOLUMES" == true ]]; then
  printf 'Resetting workspace vault from seed data...\n'
  docker run --rm -v "$ROOT_DIR:/repo" alpine:3.22 sh -c 'rm -rf /repo/.dev-workspace/duck-vault'
  mkdir -p "$WORKSPACE_DIR"
  cp -R "$SEED_DIR" "$WORKSPACE_VAULT_DIR"
fi

printf 'Pyrite dev stack is stopped.\n'
if [[ "$RESET_VOLUMES" == true ]]; then
  printf 'Workspace vault reset from seed data.\n'
fi
