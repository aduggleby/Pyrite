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

The development launch profile points at [`sample-vault/Inbox.md`](/home/alex/Source/Pyrite/sample-vault/Inbox.md) and uses `alex` / `password`.

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
cd src/pyrite-web
npm run test:e2e
```

## Docker

Build the image:

```bash
docker build -t pyrite .
```

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
