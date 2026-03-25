---
date: 2026-03-25
topic: web-based-obsidian-alternative
---

# Web-Based Obsidian Alternative

## What We're Building
We are building a single-user, mobile-first web app for browsing, searching, and editing an existing markdown vault hosted on a TrueNAS server. The app runs in Docker, uses a mounted folder as the source of truth, and edits markdown files directly in place rather than importing or syncing a copy.

The first release should feel close to Obsidian for on-the-go use, with emphasis on fast mobile editing and reliable note access away from a desktop. The goal is to make quick edits, browse folders, search across notes, follow wiki links, and inspect backlinks comfortably in a browser, while keeping the product intentionally narrower than full Obsidian parity.

## Why This Approach
We chose a mobile-first vault editor rather than a parity-first clone or a read-mostly companion. That matches the primary success bar: comfortably handling quick note edits, browsing, and search from a phone, while still staying on a path toward broader daily use.

The simpler product boundary is intentional. Single-user auth via username and password from environment settings removes account management from scope. Editing the mounted vault directly keeps the filesystem as the source of truth and avoids introducing database sync, import flows, or conflict models with the separate sync container. A pure browser app also avoids offline complexity that is not required for the first version.

## Key Decisions
- Single-user only: The app serves one person and one vault, so there is no multi-user model, sharing, or per-user permissions in scope.
- Mounted filesystem is authoritative: Notes are edited directly in the existing folder mounted into the Docker container.
- Pure browser client: No offline editing or sync behavior is required in the first version.
- Mobile-first UX: The product should optimize for phone use before desktop polish.
- Obsidian-like core only: First release includes file tree, markdown editing, preview, search, tags, wiki links, and backlinks.
- Extensive editing matters more than parity theater: The app should feel strong for real editing sessions, but v1 does not need plugins, canvas, Dataview-style features, or live collaboration.
- Authentication is minimal by design: Username and password are configured through environment variables rather than a user management system.

## Open Questions
- How close should markdown behavior be to Obsidian for embeds, callouts, task lists, and frontmatter display in v1?
- Should attachments be limited to browsing and inserting existing files, or should mobile upload be part of the initial release?
- What is the expected behavior when the mounted vault changes underneath the app due to the external sync container?
- How much desktop-specific UX should be included in the first release beyond a responsive adaptation of the mobile experience?
- Should command-palette style navigation be considered part of the core product, or deferred until after the primary mobile workflow is solid?

## Next Steps
-> `/prompts:workflows-plan` for implementation details
