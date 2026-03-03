# Changelog

Alle viktige endringer i dette prosjektet dokumenteres i denne filen.

Formatet folger prinsippene fra Keep a Changelog.

## [Unreleased]

### Added

- Rammverk for agent-arbeidsflyt i `AGENTS.md`.
- Ny teknisk dokumentasjon for hardening i `docs/engineering/hardening-notes.md`.
- Etablert `CHANGELOG.md` med standard seksjoner for lopende foring.
- Prettier-oppsett for monorepo med `format` og `format:check` scripts i root.
- Ny `.prettierignore` for a unnga stoy fra genererte filer, build-output og lockfiler.

### Changed

- Innfort repo-standarder for tekstfiler via `.editorconfig` (UTF-8, LF, final newline, trim trailing whitespace).
- Lagt til enkel `.gitattributes` for LF-normalisering i git.
- CI validerer na formattering med `pnpm -w format:check` for build-steg.

### Fixed

- Fjernet UTF-8 BOM fra tekstfiler for stabil parsing og renere diffs.

### Security

- Ingen enda.
