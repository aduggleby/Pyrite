---
date: 2026-03-25
topic: technical-architecture
---

# Technical Architecture

## What We're Building
We are building a single-container, self-hosted web app for editing an existing markdown vault on TrueNAS. The backend is `ASP.NET` with `FastEndpoints`, and the frontend is `React` with `Vite`, `TanStack`, `shadcn/ui`, and `CodeMirror 6`. There is no database. The mounted filesystem is the only persistent store, and the backend is responsible for file IO, markdown interpretation, auth, and merge/conflict handling.

The app should feel strong on mobile first, while remaining simple enough to deploy through TrueNAS custom YAML. Search is intentionally filesystem-native rather than indexed. Conflict resolution is explicit and merge-based rather than hidden or optimistic.

## Why This Approach
This stack keeps the product aligned with the original goal: a practical Obsidian-like browser editor for one user, not a platform. `ASP.NET` and `FastEndpoints` keep the backend straightforward. A single container reduces deployment friction. TanStack gives the frontend a consistent routing and data model instead of ad hoc library choices. `CodeMirror 6` is a better fit than a heavier IDE-style editor for mobile markdown editing.

Avoiding a database keeps the system honest. The vault already exists and is already synced by another container, so the app should not invent another storage layer. Similarly, search does not need an index yet because correctness and simplicity matter more than speed in v1.

## Key Decisions
- Backend stack: `ASP.NET` with `FastEndpoints`.
- Frontend stack: `React` + `Vite` + `TanStack Router` + `TanStack Query` + `shadcn/ui`.
- TanStack is the default frontend ecosystem: `Table` and `Virtual` are available when the UI justifies them.
- Editor foundation: `CodeMirror 6`.
- No database: the mounted vault is the only persistent store.
- Single deployable container: the ASP.NET app serves the built frontend.
- Auth model: server-issued HTTP-only cookie after username/password login.
- Password storage: SHA-256 hash in env vars for setup simplicity, with README instructions using `openssl`.
- Security posture: acceptable for v1 only behind TLS-terminating reverse proxy plus a second proxy-level gate.
- Config strategy: typed options with startup validation.
- Markdown interpretation is backend-authoritative.
- Search strategy: direct filesystem search and grep-style scanning, no persistent index.
- File watching: native watcher first with polling/reconciliation fallback.
- Conflict handling: backend-owned 3-way merge using base/local/remote versions, with frontend visual diff review before approval.
- Markdown scope: CommonMark/GFM plus YAML frontmatter, wikilinks, backlinks, tags, task lists, and callouts where feasible.

## Open Questions
- Which specific backend markdown library should own parsing and HTML/render output?
- Which .NET-friendly 3-way merge library is robust enough, or does merge need to be delegated to a proven external implementation?
- Which frontend diff viewer best supports mobile-readable conflict review with clear highlighting?
- What exact cookie/session lifetime is appropriate for a single-user app accessed from mobile?
- How aggressively should login rate limiting be enforced given the simple SHA-256 password scheme?
- What is the minimum browser support target for the mobile experience?
- How should attachments be handled in v1: read-only browse, insert existing files, or mobile upload support?

## Next Steps
-> `/prompts:workflows-plan` for implementation details
