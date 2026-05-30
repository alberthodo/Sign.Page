# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Onboarding wizard: plan selection, profile setup, and optional team invites.
- Pinned review threads on deliverable blocks with optional pin anchors.
- Project-wide note numbers (#1, #2, …) on comment pins.
- Project-scoped and folder-scoped client review links.
- Freelancer project workspace: folder sidebar, feedback mode, and comments panel (minimize supported).
- Dashboard: stats, attention banner, and live refresh while awaiting client review.
- Rich folder content editor: headings, text, files, drag-and-drop reorder, autosave.
- Per-folder publish flow and client link sharing.

### Changed

- “Changes requested” UI uses amber accents instead of red (status dots, badges, block highlights).
- Onboarding plan step: **Continue** and **Skip** only enabled for Personal (free); Pro / Team coming soon.

### Fixed

- Deliverable status updates to **Changes requested** when clients leave pinned notes (including asset-only folders).
- Autosave no longer resets published folders to **Draft**.
- Consistent pinned-feedback messaging and highlights across folder tabs.
- Review threads resolve the correct deliverable on project-scoped review links.

## [0.1.0] - 2026-05-22

### Added

- Open-source client review portal: projects, folders, content blocks, signatures, per-folder approval.
- `supabase/oss-schema.sql`, Docker Compose, self-host documentation.
- GitHub Actions CI (lint + build).

### Changed

- Sign.page wordmarks and app icon under `public/branding/` (proprietary; see NOTICE).
- Home route redirects to `/login`.

[0.1.0]: https://github.com/alberthodo/Sign.Page/releases/tag/v0.1.0
