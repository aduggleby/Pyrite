---
title: feat: Self-hosted markdown vault editor
type: feat
date: 2026-03-25
---

# feat: Self-hosted markdown vault editor

## Overview

Build a single-user, mobile-first web application for browsing, searching, and editing an existing markdown vault mounted into a Docker container on TrueNAS. The backend is `ASP.NET` with `FastEndpoints`; the frontend is `React` with `Vite`, `TanStack Router`, `TanStack Query`, `shadcn/ui`, and `CodeMirror 6`. There is no database. The mounted filesystem is the only persistent store.

The first release is aimed at dependable on-the-go use rather than full Obsidian parity: file tree, grep-style search, markdown editing, preview, wikilinks, backlinks, tags, task lists, callouts, attachment upload, and explicit merge-based conflict handling when files change externally.

## Problem Statement / Motivation

Existing markdown files already live in a synced vault on TrueNAS, but there is no good mobile-first browser experience for browsing, searching, and editing them directly. A companion that only reads notes is too limited, while a parity-first clone would add significant complexity before the core workflow is proven.

The product needs to stay operationally simple:

- one user
- one mounted vault
- env-only configuration
- no database
- single-container deployment

## Confirmed Decisions

- Single-user only.
- Backend-authenticated HTTP-only cookie session.
- Username plus SHA-256 password hash from env vars.
- Sliding 7-day persistent login.
- Reverse proxy TLS and an additional proxy-level gate are assumed for internet exposure.
- Backend-authoritative markdown interpretation.
- Search uses direct filesystem scanning and grep-style search, not a persistent index.
- External file changes trigger a banner and a 3-way merge review flow.
- Attachments are uploadable in v1.
- Navigation stays to file tree plus search; no command palette in v1.
- Frontend stack is standardized on TanStack plus `shadcn/ui`.
- Reserve port range `18100-18199` for Pyrite defaults: API HTTP `18100`, API HTTPS `18101`, Vite dev `18110`.

## Research Summary

### Local

This repository is effectively empty today. There are no existing implementation patterns, `docs/solutions/` learnings, or project docs beyond the active brainstorm notes.

### External

- TanStack Router recommends file-based routing as the preferred setup, which fits a greenfield Vite app well.
- ASP.NET Core `.NET 10` serves published static assets with `MapStaticAssets`, which fits the single-container deployment model.
- ASP.NET Core rate limiting requires `AddRateLimiter` at startup.
- ASP.NET Core cookie auth supports sliding expiration through `ExpireTimeSpan` plus `SlidingExpiration`.
- ASP.NET Core documents that cookie-authenticated apps are vulnerable to CSRF unless antiforgery protection is added for unsafe requests.
- `dotnet watch` documents polling file watching as necessary for some Docker-mounted and virtual filesystems, which supports a watcher-plus-polling design.
- FastEndpoints requires file uploads to be explicitly enabled via `AllowFileUploads()`, with a large-file path available when buffering should be avoided.
- Markdig is a CommonMark-compliant, extensible .NET markdown processor with YAML front matter support and an AST with source locations.
- DiffPlex exposes `IThreeWayDiffer` and `CreateMerge`, which makes it a viable first candidate for backend 3-way merge orchestration.
- CodeMirror's merge package supports unified merge review with highlighted changes, accept/reject controls, chunk navigation, and collapsed unchanged sections.

## Recommended Technical Selections

### Primary Library Choices

- Markdown engine: `Markdig`
  Why: mature .NET-first parser, good extension surface, YAML front matter support, and source-location aware AST for future editor-aware features.

- Merge engine: `DiffPlex` behind an internal merge interface
  Why: it already exposes three-way diff and merge primitives in .NET, which is a better starting point than inventing a merge algorithm in-house.

- Diff review UI: `@codemirror/merge` unified merge view
  Why: it keeps the review experience inside the same editor family, reduces styling mismatch, and already supports highlighted chunks plus accept/reject controls.

### Fallback Strategy

- If `Markdig` callout or wikilink support is not clean enough via custom extensions, keep `Markdig` as the base parser and implement those syntaxes as targeted preprocess/postprocess passes rather than replacing the markdown engine.
- If `DiffPlex` merge quality is not sufficient for real note conflicts, preserve the merge service interface and swap the implementation without changing API contracts.
- If CodeMirror unified merge review is too cramped on narrow screens, keep it for tablet/desktop and fall back to a custom chunk-by-chunk mobile review layout backed by the same merge payload.

## Proposed Solution

Create a monorepo-style application with an ASP.NET host and a Vite-built SPA served by the host in production. The backend owns auth, config validation, file system access, markdown parsing, link/backlink extraction, conflict detection, merge orchestration, and attachment writes. The frontend owns mobile-first navigation, editing UX, preview UI, search UX, and visual merge approval.

The implementation should deliberately avoid hidden state. Every note read returns a content-hash version token derived from the exact file contents served to the client. Saving a note should either succeed directly or transition into an explicit merge/review path using `base`, `local`, and `remote` content. Search and tree browsing should reflect the mounted filesystem directly rather than projecting an alternate storage model.

To keep v1 simple, derived note intelligence should favor on-demand computation over background indexing. Backlinks, tags, and wikilink resolution can be computed from the filesystem at read/search time and memoized in memory opportunistically, but they should not require a persistent index or startup crawl to function correctly.

## Technical Approach

### Architecture

Backend responsibilities:

- configuration binding and startup validation
- cookie auth and login/logout endpoints
- antiforgery token issuance and validation for unsafe requests
- login rate limiting
- file tree enumeration and note metadata
- note read/write endpoints with stale-write detection
- markdown parse/render pipeline
- wikilink, backlink, and tag extraction
- grep-style search
- attachment upload into a fixed vault-root `.attachments/` folder and corresponding file serving policy
- native watcher integration plus polling reconciliation
- 3-way merge computation and conflict endpoints

Frontend responsibilities:

- route structure for login, vault shell, note view/edit, search, and conflict review
- mobile-first app shell, file tree, and search flows
- CodeMirror-based markdown editing
- preview pane/view behavior tuned for mobile
- mutation/query coordination with TanStack Query
- conflict banner, diff review, and merge approval flow
- attachment insert/upload UX

Cross-cutting rules:

- Markdown notes are treated as UTF-8 text in v1.
- State-changing endpoints never use GET.
- Cookie auth uses secure, HTTP-only cookies and same-site settings compatible with the reverse-proxy deployment.
- Unsafe requests from the SPA send an antiforgery header obtained from the server after login or shell load.
- Vault access always resolves and validates paths against the configured root before read/write/delete decisions.
- Attachment storage uses generated safe filenames under `.attachments/`; the original client filename is metadata for UX only, not the stored path.
- Search, backlinks, and conflict detection must remain correct even if watcher events are missed.

### Implementation Phases

#### Phase 1: Foundation and Bootstrap

What:

- Initialize solution structure for ASP.NET backend and React/Vite frontend.
- Establish single-container build and runtime layout.
- Standardize local/dev default ports within the reserved Pyrite range: API HTTP `18100`, API HTTPS `18101`, Vite dev `18110`.
- Add frontend baseline dependencies: TanStack Router, TanStack Query, `shadcn/ui`, CodeMirror.
- Add backend baseline dependencies: FastEndpoints, cookie auth, rate limiting, validation/config packages as needed.
- Set up file-based TanStack Router generation in the Vite workflow.
- Define shared DTO/versioning types between frontend and backend early to keep note IO and merge payloads stable.

Why:

- This creates the deployable skeleton and avoids later rework around hosting boundaries.

Success criteria:

- Local dev can run backend and frontend.
- Production build emits one deployable container artifact.
- ASP.NET serves the built SPA successfully.

#### Phase 2: Configuration, Auth, and Security Baseline

What:

- Implement typed options for vault path, username, password hash, cookie settings, upload limits, and watcher settings.
- Add startup validation with fail-fast errors.
- Implement login/logout/session endpoints and HTTP-only secure cookie auth with a sliding 7-day expiration.
- Add antiforgery token issuance for the SPA and require antiforgery validation on unsafe cookie-authenticated endpoints.
- Add login rate limiting and basic audit logging.
- Add password hashing helper and compatibility tests that match the documented `openssl` command exactly.

Why:

- Auth and config are the highest-risk operational pieces for a self-hosted public-facing app with intentionally simple credentials.

Success criteria:

- App refuses invalid startup config.
- Login succeeds only for the configured credentials.
- Sliding 7-day session works as expected.
- Unsafe requests without a valid antiforgery token fail.
- Tests prove the in-app SHA-256 behavior matches the README command.

#### Phase 3: Vault Filesystem Contract

What:

- Implement vault root access service with path safety guards.
- Implement file tree listing, file read, note metadata, and binary attachment discovery.
- Add write path with optimistic stale-write detection based on the content-hash version token returned with note reads.
- Add upload endpoint for attachments into the vault-root `.attachments/` folder.
- Add watcher abstraction with native events plus periodic reconciliation fallback for Docker/NAS behavior.
- Preserve or normalize line endings intentionally during note writes so saves do not create avoidable diff noise.
- Generate attachment filenames safely, retain extensions where appropriate, and insert relative markdown links back into the active note flow.

Why:

- The filesystem is the database. This contract has to be correct before richer note features are trustworthy.

Success criteria:

- App can browse the mounted vault safely.
- Notes and attachments can be read and written without escaping the configured root.
- External changes are detected reliably enough to drive the UI banner.
- Uploaded attachments land in a predictable vault-root `.attachments/` location.

#### Phase 4: Markdown and Note Intelligence

What:

- Integrate `Markdig` as the backend markdown pipeline.
- Support CommonMark/GFM, frontmatter, task lists, wikilinks, tags, backlinks, and callouts in v1.
- Define a normalized preview/output model for the frontend.
- Extract link graph and tags from note content on read or save.
- Treat wikilinks and backlinks as application semantics layered on top of markdown parsing rather than as a separate storage model.

Why:

- This is the core of the “Obsidian-like” value and should be consistent across edit, preview, and search results.

Success criteria:

- Notes render predictably from backend output.
- Wikilinks resolve consistently.
- Backlinks and tags are available without a database.

#### Phase 5: Mobile-First Frontend Shell

What:

- Build route tree and app shell with login flow, vault shell, file tree, search, and note screen.
- Implement touch-friendly navigation primitives, bottom actions/toolbar where needed, and mobile keyboard-safe layouts.
- Follow the [Pyrite Style Guide](/home/alex/Source/Pyrite/docs/style/STYLE.md) ("Ink & Paper") for all UI elements: colors, typography, spacing, shadows, components, and animations.
- Add CodeMirror markdown editor with essential formatting affordances.
- Add preview mode and note metadata panels only where they support the mobile workflow.
- Keep note route state URL-addressable so a specific note/search view can be reopened directly after refresh or login.
- Use optimistic UI carefully: local editor state can update immediately, but note save success only commits after the backend confirms the version token still matches.

Why:

- The success bar is phone usability first, not desktop feature density.

Success criteria:

- Browsing, searching, opening, editing, and saving a note are comfortable on a phone-sized viewport.
- The UI remains usable without a command palette.

#### Phase 6: Search, Conflict Resolution, and Merge Review

What:

- Implement grep-style search endpoints and frontend results UX.
- Detect stale writes and surface conflict banners.
- Integrate backend 3-way merge flow using `DiffPlex` behind an internal merge service interface.
- Build frontend diff/merge review UI with CodeMirror unified merge review, highlighted changes, explicit approval, and a mobile fallback if the full merge view is too dense.
- Return merge payloads that include merged text, conflict blocks, and enough positional metadata to support chunk navigation and approval UX.

Why:

- This is the main differentiator from a naive markdown editor on top of a shared folder.

Success criteria:

- Search is correct across the vault.
- Conflicts never overwrite external changes silently.
- User can inspect and approve merged content before save.

#### Phase 7: Deployment, Documentation, and Hardening

What:

- Add Dockerfile and any required publish/build scripts.
- Write README with TrueNAS custom YAML installation instructions.
- Document the exact `openssl` command for generating the SHA-256 env hash.
- Document reverse proxy expectations, volume mounts, upload limits, and security caveats.
- Document the need for proxy TLS, proxy-level access control, and the app's antiforgery/cookie assumptions.
- Document the reserved Pyrite port range and the default dev/runtime ports used by local tooling and examples.
- Add smoke checks for startup, auth, file access, and upload behavior.

Why:

- For a self-hosted app, deployability and accurate operator docs are part of the feature, not post-work.

Success criteria:

- A user can deploy via TrueNAS custom YAML from the README alone.
- The hash-generation instructions and automated tests remain in sync.

## Acceptance Criteria

### Functional Requirements

- [ ] User can log in with env-configured username and SHA-256 password hash.
- [ ] Session uses a sliding 7-day expiration with a secure HTTP-only cookie.
- [ ] User can browse the mounted vault as a file/folder tree.
- [ ] User can open, edit, preview, and save markdown notes directly in place.
- [ ] User can search note contents and filenames across the vault.
- [ ] User can follow wikilinks and inspect backlinks.
- [ ] User can view tags and task-list capable notes.
- [ ] User can upload attachments into the vault from the web UI.
- [ ] User is warned when a note changed externally while being edited.
- [ ] User can review and approve a highlighted 3-way merge result before committing a conflicted save.
- [ ] Unsafe authenticated requests require a valid antiforgery token.

### Non-Functional Requirements

- [ ] App runs without a database.
- [ ] App ships as a single container suitable for TrueNAS custom YAML deployment.
- [ ] Backend prevents path traversal and writes outside the mounted vault.
- [ ] Login is rate limited.
- [ ] Cookie-authenticated unsafe requests are CSRF-protected.
- [ ] Production deployment assumes TLS at the reverse proxy and supports a second proxy-level gate.
- [ ] Mobile viewports are the primary UX target.

### Quality Gates

- [ ] Backend tests cover auth, hash compatibility, path safety, note IO, conflict detection, and merge paths.
- [ ] Backend tests cover antiforgery enforcement and attachment naming/path safety.
- [ ] Frontend tests cover core routing and critical UI states.
- [ ] At least one browser E2E path covers login, open note, edit/save, upload, and conflict review.
- [ ] README documents installation, config, and security assumptions.

## Dependencies & Risks

### Dependencies

- Mounted TrueNAS vault path available to the container.
- Reverse proxy with TLS termination.
- `Markdig`.
- `DiffPlex` or a drop-in replacement behind the merge service interface.
- CodeMirror merge UI.

### Risks

- Docker/NAS file watching may be unreliable.
  Mitigation: treat watcher events as hints and reconcile on interval plus on write.

- Simple SHA-256 env auth is weaker than bcrypt/Argon2.
  Mitigation: require proxy TLS, recommend second proxy gate, rate limit login, and document exposure limits clearly.

- Cookie-based auth introduces CSRF risk for unsafe requests.
  Mitigation: issue antiforgery tokens to the SPA, require them on unsafe endpoints, and keep state-changing routes off GET.

- 3-way merge library quality may be uneven in .NET.
  Mitigation: evaluate early and be willing to isolate merge behind an internal interface.

- Mobile editing UX can become desktop-biased if too many controls are added.
  Mitigation: validate primary flows on phone-sized viewports throughout implementation.

## Open Decisions for Early Planning Execution

- Confirm the exact `Markdig` extension pipeline and where custom wikilink/callout handling lives.
- Validate `DiffPlex` merge quality against realistic markdown note conflicts before locking the API response shape.
- Confirm whether CodeMirror unified merge review is acceptable on narrow mobile viewports or needs a dedicated compact review mode.

## Recommended Execution Order

1. Resolve the three library selections first: markdown, merge, diff viewer.
2. Bootstrap the solution and production hosting model.
3. Ship config/auth/hash tests before note editing.
4. Build the filesystem contract before the editor UI gets deep.
5. Add markdown intelligence and note UX.
6. Finish with merge review, docs, and deployment hardening.

## Concrete Implementation Notes

### API Surface

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/security/antiforgery-token`
- `GET /api/vault/tree`
- `GET /api/notes/{path}`
- `PUT /api/notes/{path}`
- `POST /api/notes/{path}/attachments`
- `GET /api/search`
- `POST /api/notes/{path}/merge-preview`
- `POST /api/notes/{path}/merge-commit`

### Note Read/Write Contract

- Note reads should return raw markdown, rendered preview payload, resolved path metadata, and a content-hash version token.
- Note saves should require the last-seen version token.
- If the version token is stale, the backend should load the latest disk content and produce a merge-preview response instead of silently failing or overwriting.

### Attachment Rules

- Store uploads under `.attachments/` with generated safe names and preserved extensions.
- Return both vault-relative path and markdown-ready relative link text.
- Validate content length and allowed extension/MIME rules conservatively in v1.

### Backlinks and Search

- Search should favor correctness over indexing: filename matches plus content matches from direct scans.
- Backlinks can be computed by scanning markdown files for references to the current note's canonical wikilink targets.
- Any in-memory cache must be disposable and rebuildable without affecting correctness.

### Testing Matrix

- Unit tests: hashing, version-token generation, path resolution, wikilink parsing, merge service behavior.
- Integration tests: login flow, antiforgery enforcement, note read/write, stale save to merge preview, attachment upload, search endpoints.
- Browser E2E: login, open note, edit/save, upload attachment, trigger conflict, approve merge, verify persisted result.

### Port Allocation

- Reserved project range: `18100-18199`
- Backend HTTP default: `18100`
- Backend HTTPS default: `18101`
- Frontend Vite dev default: `18110`
- README, local launch settings, Docker examples, and E2E configuration should all use these defaults unless there is a specific reason to diverge.

## References & Research

### Internal References

- [Pyrite Style Guide — "Ink & Paper"](/home/alex/Source/Pyrite/docs/style/STYLE.md) — comprehensive visual design reference for all UI elements, colors, typography, spacing, components, and shadcn/ui overrides
- [web-based-obsidian-alternative brainstorm](/home/alex/Source/Pyrite/docs/brainstorms/2026-03-25-web-based-obsidian-alternative-brainstorm.md)
- [technical-architecture brainstorm](/home/alex/Source/Pyrite/docs/brainstorms/2026-03-25-technical-architecture-brainstorm.md)

### External References

- TanStack Router route trees and file-based routing: https://tanstack.com/router/latest/docs/routing/route-trees
- TanStack Router file-based routing guide: https://tanstack.com/router/v1/docs/framework/react/routing/file-based-routing
- ASP.NET Core static assets in `.NET 10`: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/map-static-files?view=aspnetcore-10.0
- ASP.NET Core cookie auth and sliding expiration: https://learn.microsoft.com/en-us/aspnet/core/security/authentication/cookie?view=aspnetcore-10.0
- ASP.NET Core antiforgery for SPAs and cookie-authenticated requests: https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0
- ASP.NET Core rate limiting service requirement: https://learn.microsoft.com/en-us/dotnet/core/compatibility/aspnet-core/8.0/addratelimiter-requirement
- ASP.NET Core rate limiting middleware: https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit?view=aspnetcore-10.0
- `dotnet watch` polling watcher note for Docker-mounted and virtual file systems: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-watch
- FastEndpoints file handling and uploads: https://fast-endpoints.com/docs/file-handling
- Markdig repository and docs: https://github.com/xoofx/markdig
- DiffPlex repository and three-way diff support: https://github.com/mmanela/diffplex
- CodeMirror merge package: https://github.com/codemirror/merge
- CodeMirror merge reference: https://codemirror.net/docs/ref/
