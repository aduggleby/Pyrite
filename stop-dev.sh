#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED_DIR="$ROOT_DIR/dev/duck-vault"
WORKSPACE_DIR="$ROOT_DIR/.dev-workspace"
WORKSPACE_VAULT_DIR="$WORKSPACE_DIR/duck-vault"

RESET_VOLUMES=false

if [[ "${1:-}" == "--volumes" ]]; then
  RESET_VOLUMES=true
fi

docker compose -f "$ROOT_DIR/compose.dev.yml" down --remove-orphans

if [[ "$RESET_VOLUMES" == true ]]; then
  docker run --rm -v "$ROOT_DIR:/repo" alpine:3.22 sh -c 'rm -rf /repo/.dev-workspace/duck-vault'
  mkdir -p "$WORKSPACE_DIR"
  cp -R "$SEED_DIR" "$WORKSPACE_VAULT_DIR"
fi

printf 'Pyrite dev stack is stopped.\n'
if [[ "$RESET_VOLUMES" == true ]]; then
  printf 'Workspace vault reset from seed data.\n'
fi
