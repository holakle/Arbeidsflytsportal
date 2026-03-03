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
- Ny `SECURITY.md` med policy for privat sårbarhetsrapportering og responstider.
- Dependabot er konfigurert i `.github/dependabot.yml` for npm og GitHub Actions (ukentlig).
- `/health`-endepunkt returnerer nå `{ ok: true, uptime, timestamp }` med enkel `db`-status.

### Changed

- Innfort repo-standarder for tekstfiler via `.editorconfig` (UTF-8, LF, final newline, trim trailing whitespace).
- Lagt til enkel `.gitattributes` for LF-normalisering i git.
- CI validerer na formattering med `pnpm -w format:check` for build-steg.
- `docker-compose.yml` bruker na miljovariabler fra `.env` for Postgres i stedet for hardkodede credentials.
- Postgres-port er bundet til `127.0.0.1:5432` for a redusere utilsiktet LAN-eksponering.
- `docker-compose.yml` har nå valgfri `api`-service med healthcheck og `depends_on` mot healthy Postgres.

### Fixed

- Fjernet UTF-8 BOM fra tekstfiler for stabil parsing og renere diffs.
- Rate limit TTL-enhet er gjort entydig: API bruker `RATE_LIMIT_TTL_MS` direkte i millisekunder.

### Security

- Innfort standard kanal for sikkerhetsrapportering med privat disclosure-flyt.
- Tydeliggjort at hemmeligheter ikke skal postes i offentlige issues.
- Strammet inn lokal Docker-setup med placeholders i `.env.example` og mindre eksponering av DB-port.
- Mindre risiko for feilkonfigurert throttling ved tydelig TTL-enhet i miljøvariabler.
