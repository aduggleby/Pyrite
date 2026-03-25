# AGENTS.md

Project guidance for work inside `/home/alex/Source/Pyrite`.

## Product Intent

Pyrite is a single-user, mobile-first, self-hosted markdown vault editor for TrueNAS.

The app runs in Docker, mounts an existing markdown vault, and edits files directly in place. There is no database. The mounted filesystem is the source of truth.

The first release is intentionally narrower than full Obsidian parity. Build the core workflow well:

- login
- browse file tree
- search notes
- open note
- edit markdown comfortably on mobile
- preview rendered markdown
- follow wikilinks
- inspect backlinks
- upload attachments
- handle external file conflicts through explicit merge review

Do not drift into plugin ecosystems, collaboration, canvas, or command-palette work unless explicitly requested.

## Stack Decisions

These are the current project decisions. Follow them unless the user changes them.

- Backend: `ASP.NET` on `.NET 10`
- Endpoint framework: `FastEndpoints`
- Frontend: `React` + `Vite`
- Routing/data: `TanStack Router` + `TanStack Query`
- Component layer: `shadcn/ui`
- Editor: `CodeMirror 6`
- Markdown engine: `Markdig`
- Merge engine: `DiffPlex` behind an internal merge service interface
- Diff UI: `@codemirror/merge`

## Hard Constraints

- No database
- Single user only
- Env-only configuration
- Single deployable container in production
- Cookie auth only
- Username + SHA-256 password hash from env vars
- Sliding 7-day session
- Reverse proxy with TLS is assumed
- App may be internet-exposed only behind a reverse proxy and ideally a second proxy-level gate

## Filesystem Rules

- Treat the mounted vault as authoritative.
- Never introduce an alternate persistent storage model.
- All vault access must resolve against the configured root and reject path traversal.
- Notes are UTF-8 text in v1.
- Attachments upload into vault-root `.attachments/`.
- Stored attachment filenames must be generated safe names. Original filenames are display metadata only.
- Preserve or intentionally normalize line endings. Do not create avoidable diff noise.

## Conflict Model

- Every note read returns a content-hash version token derived from the exact file contents served.
- Note saves must require that version token.
- If the token is stale, do not overwrite the file.
- Instead, load the latest disk content and run a 3-way merge using:
  - `base`: content the editor opened
  - `local`: user edits
  - `remote`: latest file from disk
- The user must review a highlighted merge result before commit.

## Search and Note Intelligence

- Search should be direct filesystem scanning / grep-style search.
- Prefer correctness and simplicity over indexing.
- Backlinks, tags, and wikilink resolution should work without a persistent index.
- In-memory caches are allowed only as disposable accelerators, never as required state.

## Security Rules

- Use secure, HTTP-only cookies.
- Protect unsafe cookie-authenticated requests with antiforgery tokens.
- Never use GET for state-changing actions.
- Add login rate limiting.
- Keep the simple SHA-256 auth scheme clearly documented as a convenience tradeoff, not hardened public auth.

## Frontend Rules

- Mobile-first is the primary UX target.
- Avoid desktop-heavy layouts and control density.
- File tree plus search is the navigation model in v1.
- No command palette unless explicitly requested later.
- Keep note URLs addressable so views can be restored after refresh/login.
- Be careful with optimistic UI: local editor state may update immediately, but saves are only authoritative after backend confirmation.

### Style Guide

**All frontend UI work must follow the [Pyrite Style Guide — "Ink & Paper"](/home/alex/Source/Pyrite/docs/style/STYLE.md).** Read it before writing any frontend component code.

Key rules:

- **Colors:** Use the `parchment`, `ink`, and `accent` semantic tokens. Never use pure black/white or gray Tailwind defaults.
- **Typography:** Newsreader (headings), Source Serif 4 (body), SF Mono (editor). Never use Inter, Roboto, or system sans-serif.
- **Shadows:** Use warm paper shadows with `rgba(44, 24, 16, ...)` tones, not standard Tailwind gray shadows.
- **Borders:** Use warm transparent borders (`border-ink/8`), not `border-gray-*`.
- **Components:** Follow the documented patterns for app header, bottom nav, file tree, wikilinks, tag pills, task checkboxes, search input/results, editor line numbers, editor toolbar, and badges.
- **shadcn/ui:** Override all shadcn defaults to match the Ink & Paper aesthetic — see the "shadcn/ui Integration Notes" section in the style guide for Button, Input, Dialog, DropdownMenu, Checkbox, and ScrollArea overrides.
- **Animations:** Keep under 350ms, use ease/ease-in-out curves only, only animate opacity/transform/max-height/color.
- **Tap targets:** Minimum 44px, prefer 48px for primary navigation.

The style guide includes screenshots of every screen state and full code examples for every component.

## Backend Rules

- Backend owns auth, config validation, filesystem IO, markdown interpretation, stale-write detection, merge orchestration, and search APIs.
- Frontend must not become the source of truth for markdown semantics.
- Keep markdown-specific application behavior like wikilinks, backlinks, and callouts centralized on the backend.
- Isolate merge logic behind an internal service interface so the implementation can be replaced if needed.

## Ports

Reserved range for Pyrite in `/home/alex/Source/PORTS.md`:

- `18100-18199`

Default assignments:

- Backend HTTP: `18100`
- Backend HTTPS: `18101`
- Vite dev: `18110`

Use these defaults in local config, examples, tests, and docs unless there is a clear reason to diverge.

## Documentation Requirements

Keep the README aligned with the implementation. It must include:

- TrueNAS custom YAML install instructions
- required env vars
- volume mount expectations
- reverse proxy expectations
- the exact `openssl` command used to generate the SHA-256 password hash

If auth hash behavior changes, update the README and the compatibility tests together.

## Testing Expectations

Before considering a feature complete, cover the relevant paths with tests.

Use `./test-app.sh` for app-level browser verification. It resets the gitignored `.dev-workspace/` vault, starts the Docker dev stack, runs the Playwright suite against the running app, and stops the stack afterward.

- Backend tests:
  - hash compatibility with the documented `openssl` command
  - auth and session behavior
  - antiforgery enforcement
  - path safety
  - note read/write behavior
  - stale write detection
  - merge flow
  - attachment naming/path safety

- Frontend tests:
  - routing
  - login flow states
  - note loading and save states
  - conflict UI states

- Browser E2E:
  - login
  - open note
  - edit/save
  - upload attachment
  - trigger conflict
  - review and approve merge

## Working Style

- Prefer boring, explicit solutions over clever abstractions.
- Keep derived behavior on demand where practical.
- Avoid scope creep.
- When choosing between parity and reliability, choose reliability.
- When choosing between speed and simplicity for v1, choose simplicity unless the user says otherwise.
- Make incremental Git commits regularly while implementing. Group each commit into a coherent, tested unit of work instead of waiting until the entire plan is finished.

## Primary References

When deeper context is needed, use:

- [Implementation plan](/home/alex/Source/Pyrite/docs/plans/2026-03-25-feat-self-hosted-markdown-vault-editor-plan.md)
- [Style guide — "Ink & Paper"](/home/alex/Source/Pyrite/docs/style/STYLE.md)
