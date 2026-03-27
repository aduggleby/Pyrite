# Changelog

All notable changes to this project will be documented in this file.

## [0.1.3] - 2026-03-26

### Changed
- Internal improvements

## [0.1.2] - 2026-03-26

### Added
- README screenshot gallery with clickable mobile views for login, vault tree, note view, edit, and search.
- OCI source label on the Docker image so GHCR can link the published image back to the repository.
- Version badge in the README.
- Repository `CHANGELOG.md`.

### Changed
- ANDO build and release workflow is now the primary build path, with `build.csando`, GHCR publishing, git tagging, and release-ready versioning from the project file.
- README deployment examples now point at `ghcr.io/aduggleby/pyrite`.
- Vitest/jsdom setup now shims `Range` layout methods so CodeMirror merge-view tests stop writing noise to stderr in ANDO runs.

## [0.1.1] - 2026-03-26

### Added
- Multi-arch GHCR publish flow for `ghcr.io/aduggleby/pyrite` with version and `latest` tags.
- `ando.config` for reproducible default ANDO behavior in this repository.

### Changed
- Minor release created through `ando release`.
- Build verification now includes backend restore/build/test and frontend install/test/build through ANDO.

## [0.1.0] - 2026-03-26

### Added
- Initial Pyrite release: single-user markdown vault editor for TrueNAS-style self-hosting.
- Cookie auth, filesystem-backed note editing, search, markdown preview, wikilinks, merge review, and attachment uploads.
- Docker development scripts with seeded vault data and browser E2E coverage.
- React/Vite mobile-first frontend and ASP.NET Core 10 backend.
- ANDO build script and release support.
