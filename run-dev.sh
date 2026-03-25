#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED_DIR="$ROOT_DIR/dev/duck-vault"
WORKSPACE_DIR="$ROOT_DIR/.dev-workspace"
WORKSPACE_VAULT_DIR="$WORKSPACE_DIR/duck-vault"
LOGS_DIR="$ROOT_DIR/logs"
DEV_LOG_DIR="$LOGS_DIR/dev"
RUN_LOG_FILE="$DEV_LOG_DIR/run-dev.log"
SESSION_NAME="pyrite-dev"
COMPOSE_FILE="$ROOT_DIR/compose.dev.yml"
USE_TMUX="${PYRITE_NO_TMUX:-0}"
DETACH_TMUX="${PYRITE_TMUX_DETACH:-0}"

ensure_workspace() {
  mkdir -p "$WORKSPACE_DIR"

  if [[ ! -d "$WORKSPACE_VAULT_DIR" ]]; then
    cp -R "$SEED_DIR" "$WORKSPACE_VAULT_DIR"
  fi
}

reset_dev_logs() {
  rm -rf "$DEV_LOG_DIR"
  mkdir -p "$DEV_LOG_DIR"
}

start_tmux_logs() {
  local pyrite_container_log="$DEV_LOG_DIR/pyrite-container.log"
  local vault_container_log="$DEV_LOG_DIR/vault-sidecar-container.log"
  local api_log="$DEV_LOG_DIR/pyrite-api.log"
  local first_pane_id
  local second_pane_id

  tmux has-session -t "$SESSION_NAME" 2>/dev/null && tmux kill-session -t "$SESSION_NAME"
  touch "$pyrite_container_log" "$vault_container_log" "$api_log"

  first_pane_id="$(tmux new-session -d -P -F '#{pane_id}' -s "$SESSION_NAME" -n logs \
    "bash -lc 'cd \"$ROOT_DIR\" && docker compose -f \"$COMPOSE_FILE\" logs -f pyrite | tee \"$pyrite_container_log\"'"
  )"
  second_pane_id="$(tmux split-window -h -P -F '#{pane_id}' -t "$first_pane_id" \
    "bash -lc 'cd \"$ROOT_DIR\" && docker compose -f \"$COMPOSE_FILE\" logs -f vault-sidecar | tee \"$vault_container_log\"'")"
  tmux split-window -v -P -F '#{pane_id}' -t "$first_pane_id" \
    "bash -lc 'touch \"$api_log\" && tail -n 200 -F \"$api_log\"'" >/dev/null
  tmux split-window -v -P -F '#{pane_id}' -t "$second_pane_id" \
    "bash -lc 'tail -n 200 -F \"$RUN_LOG_FILE\"'" >/dev/null
  tmux select-layout -t "$SESSION_NAME" tiled >/dev/null
}

attach_tmux_session() {
  if [[ -n "${TMUX:-}" ]]; then
    tmux switch-client -t "$SESSION_NAME"
  else
    tmux attach-session -t "$SESSION_NAME"
  fi
}

reset_dev_logs
exec > >(tee "$RUN_LOG_FILE") 2>&1

printf 'Preparing workspace...\n'
ensure_workspace

PYRITE_UID="$(id -u)"
PYRITE_GID="$(id -g)"
export PYRITE_UID
export PYRITE_GID

printf 'Starting Docker dev stack...\n'
docker compose -f "$COMPOSE_FILE" up --build -d

printf 'Pyrite dev stack is running.\n'
printf 'App: http://localhost:18100\n'
printf 'Vault workspace: %s\n' "$WORKSPACE_VAULT_DIR"
printf 'Logs: %s\n' "$DEV_LOG_DIR"

if [[ "$USE_TMUX" == "1" ]]; then
  printf 'Tmux disabled for this run.\n'
  exit 0
fi

printf 'Launching tmux log session...\n'
start_tmux_logs
printf 'Tmux session: %s\n' "$SESSION_NAME"

if [[ "$DETACH_TMUX" == "1" ]]; then
  printf 'Tmux attach skipped for this run.\n'
  exit 0
fi

attach_tmux_session
