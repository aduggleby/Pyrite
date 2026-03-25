# Pyrite

Pyrite is a single-user, mobile-first, self-hosted markdown vault editor for TrueNAS. It mounts an existing markdown vault, reads and writes notes directly in place, and keeps the filesystem as the only source of truth.

## What It Ships

- Username/password login with a sliding 7-day cookie session
- File tree browsing and grep-style search
- Markdown editing, preview, wikilinks, backlinks, tags, and task list extraction
- Attachment upload into vault-root `.attachments/`
- Stale-write detection with explicit merge review before commit
- Single-container deployment with the ASP.NET app serving the built React frontend

## Required Environment Variables

Use env-only configuration in production.

```env
PYRITE__VAULTROOT=/vault
PYRITE__AUTH__USERNAME=alex
PYRITE__AUTH__PASSWORDSHA256=<sha256-hash>
PYRITE__UPLOADS__MAXBYTES=10000000
```

`PYRITE__VAULTROOT` must point at the mounted markdown vault inside the container.

## Generate The Password Hash

Pyrite expects a lowercase SHA-256 hex digest of the raw password bytes with no trailing newline.

```bash
printf %s "your-password" | openssl dgst -sha256 -binary | xxd -p -c 256
```

This is intentionally a convenience tradeoff for single-user self-hosting. It is not a hardened public auth system. Run Pyrite behind a TLS-terminating reverse proxy and ideally a second proxy-level gate.

## Local Development

### Scripted Docker Dev

The recommended local workflow runs everything in Docker against a copied seed vault.

```bash
./run-dev.sh
```

This starts a live-reload development stack and opens a `tmux` session with split log panes:

- `pyrite-dev-api`: ASP.NET backend with `dotnet watch` on `http://localhost:18100`
- `pyrite-dev-web`: Vite dev server with frontend HMR on `http://localhost:18110`
- `pyrite-dev-vault`: a sidecar shell container that mounts the same `/vault`
- `logs/dev/run-dev.log`: the dev launcher output
- `logs/dev/pyrite-api-container.log`: `docker compose logs -f pyrite`
- `logs/dev/pyrite-web-container.log`: `docker compose logs -f pyrite-web`
- `logs/dev/pyrite-api.log`: application file log output from inside the app container

The sidecar is useful for inspecting or modifying the mounted vault while Pyrite is running:

```bash
docker exec -it pyrite-dev-vault sh
```

The committed seed vault lives in [`dev/duck-vault`](/home/alex/Source/Pyrite/dev/duck-vault) and contains about fifty duck-focused markdown notes across four top-level folders and multiple subfolders.

`./run-dev.sh` copies that seed vault into `.dev-workspace/duck-vault` the first time it runs. After that, the workspace persists across restarts so edits remain available.

Every `./run-dev.sh` invocation clears `logs/dev/` before the stack starts. Frontend source edits are served through Vite HMR, and backend source edits reload through `dotnet watch`. For automation, set `PYRITE_NO_TMUX=1` to skip the interactive `tmux` attach.

Stop the dev stack:

```bash
./stop-dev.sh
```

Stop it and reset the workspace vault back to a fresh copy of the committed duck seed set:

```bash
./stop-dev.sh --volumes
```

`.dev-workspace/` is intentionally gitignored.

## Logging

Development runs write fresh logs into gitignored `logs/dev/` on each start.

Production writes rolling daily logs into `logs/prod/` and retains the latest 30 files. If you want those logs persisted outside the container, mount the `logs/` directory as a volume in your deployment.

### Direct Local Tooling

Backend defaults:

- HTTP: `18100`
- HTTPS: `18101`

Frontend default:

- Vite dev server: `18110`

Start the backend:

```bash
dotnet run --project src/Pyrite.Api/Pyrite.Api.csproj --launch-profile http
```

Start the frontend:

```bash
cd src/pyrite-web
npm install
npm run dev
```

The development launch profile points at [`dev/sample-vault/Inbox.md`](/home/alex/Source/Pyrite/dev/sample-vault/Inbox.md) and uses `alex` / `password`.

## Tests

Backend tests:

```bash
dotnet test Pyrite.slnx
```

Frontend tests:

```bash
cd src/pyrite-web
npm test
```

Browser E2E:

```bash
./test-app.sh
```

## Docker

Build the image:

```bash
docker build -t pyrite .
```

For the local dev stack, prefer [`compose.dev.yml`](/home/alex/Source/Pyrite/compose.dev.yml) through `./run-dev.sh` and `./stop-dev.sh`.

Run it:

```bash
docker run --rm \
  -p 18100:18100 \
  -e PYRITE__VAULTROOT=/vault \
  -e PYRITE__AUTH__USERNAME=alex \
  -e PYRITE__AUTH__PASSWORDSHA256="$(printf %s "password" | openssl dgst -sha256 -binary | xxd -p -c 256)" \
  -v /path/to/your/vault:/vault \
  pyrite
```

## TrueNAS Custom YAML

Replace the image reference and host path for your environment.

```yaml
services:
  pyrite:
    image: ghcr.io/your-org/pyrite:latest
    restart: unless-stopped
    environment:
      PYRITE__VAULTROOT: /vault
      PYRITE__AUTH__USERNAME: alex
      PYRITE__AUTH__PASSWORDSHA256: "<sha256-hash>"
      PYRITE__UPLOADS__MAXBYTES: "10000000"
    volumes:
      - /mnt/tank/notes:/vault
    ports:
      - "18100:18100"
```

## Reverse Proxy Expectations

- Terminate TLS at the reverse proxy.
- Prefer an additional proxy-level gate such as VPN, SSO, or basic auth.
- Forward requests to container port `18100`.
- Do not expose Pyrite directly on the public internet without that proxy layer.

## Volume Mount Expectations

- Mount the real markdown vault read/write at the same path provided in `PYRITE__VAULTROOT`.
- Notes are treated as UTF-8 text in v1.
- Uploaded attachments are stored under `<vault>/.attachments/`.
- Pyrite rejects path traversal and only resolves files under the configured vault root.
