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
- Mobil login-flyt med dev-brukervalg (`/login`), Today-visning (`/today`) og WorkOrder-detalj for montørflyt.
- Nye API-endepunkt for arbeidsøkter: `POST /workorders/:id/start|pause|finish` og `GET /me/sessions/active`.
- Nye API-endepunkt for vedlegg (dev-storage) på arbeidsordre: `GET|POST /workorders/:id/attachments`.
- Nye API-endepunkt for varslinger: `GET /notifications` og `POST /notifications/read`.
- Nye ADR-notater i `docs/adr/` for status-enum, work session lifecycle og storage-provider.

### Changed

- Innfort repo-standarder for tekstfiler via `.editorconfig` (UTF-8, LF, final newline, trim trailing whitespace).
- Lagt til enkel `.gitattributes` for LF-normalisering i git.
- CI validerer na formattering med `pnpm exec prettier . --check` for build-steg.
- Root-scriptflyt er forenklet: `pnpm dev` er standard core-flyt (API + web), mens full flyt er flyttet til `pnpm dev:all`.
- Overlappende root-scripts (`dev:core`, `dev:api`, `dev:web`, `format`, `format:check`) er fjernet for aa redusere valgflate.
- README er konsolidert som eneste operative runbook for oppstart, daglig drift, tunnel og shutdown.
- `docs/oppstart_info.md` er redusert til peker mot README, og `docs/INFO.md` er strammet til arkitektur/prinsipper.
- Flow-generator publiserer na rutedata kun i `docs/flows/routes.generated.md`; `docs/flows/frontend.md` er manuell forklaring.
- `docker-compose.yml` bruker na miljovariabler fra `.env` for Postgres i stedet for hardkodede credentials.
- Postgres-port er bundet til `127.0.0.1:5432` for a redusere utilsiktet LAN-eksponering.
- `docker-compose.yml` har nå valgfri `api`-service med healthcheck og `depends_on` mot healthy Postgres.
- `WorkOrder.status` er migrert fra fri tekst til enum (`DRAFT` ... `CANCELLED`) med datamapping fra legacy verdier.
- `WorkOrder` er utvidet med felt for kunde/kontakt/adresse/HMS/tilkomst og geo-koordinater.
- `Schedule`-API støtter nå `POST /schedule` og `PATCH /schedule/:id` med konfliktvarsling og metadata i respons.
- Web- og mobilvisninger bruker oppdaterte arbeidsordre-felt og nye statusverdier.

### Fixed

- Fjernet UTF-8 BOM fra tekstfiler for stabil parsing og renere diffs.
- Rate limit TTL-enhet er gjort entydig: API bruker `RATE_LIMIT_TTL_MS` direkte i millisekunder.
- Multi-tenant flyt er strammet inn for nye arbeidsøkt-, vedlegg- og notifikasjonsendepunkt ved konsekvent bruk av `organizationId`.

### Security

- Innfort standard kanal for sikkerhetsrapportering med privat disclosure-flyt.
- Tydeliggjort at hemmeligheter ikke skal postes i offentlige issues.
- Strammet inn lokal Docker-setup med placeholders i `.env.example` og mindre eksponering av DB-port.
- Mindre risiko for feilkonfigurert throttling ved tydelig TTL-enhet i miljøvariabler.
