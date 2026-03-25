#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED_DIR="$ROOT_DIR/dev/duck-vault"
WORKSPACE_DIR="$ROOT_DIR/.dev-workspace"
WORKSPACE_VAULT_DIR="$WORKSPACE_DIR/duck-vault"

ensure_workspace() {
  mkdir -p "$WORKSPACE_DIR"

  if [[ ! -d "$WORKSPACE_VAULT_DIR" ]]; then
    cp -R "$SEED_DIR" "$WORKSPACE_VAULT_DIR"
  fi
}

ensure_workspace

docker compose -f "$ROOT_DIR/compose.dev.yml" up --build -d

printf 'Pyrite dev stack is running.\n'
printf 'App: http://localhost:18100\n'
printf 'Vault workspace: %s\n' "$WORKSPACE_VAULT_DIR"
printf 'Sidecar: docker exec -it pyrite-dev-vault sh\n'
