# Hardening Notes

## Hvorfor vi gjor hardening

- Redusere risiko for regresjoner, feilkonfigurasjon og usikre endringer.
- Gjore leveranser mer forutsigbare via faste arbeidsrutiner.
- Sikre sporbarhet i kode, CI og dokumentasjon.

## Hva som er gjort

- Definert agent-arbeidsflyt i `AGENTS.md`:
  - branch-policy (`hardening/<kort-navn>`)
  - atomiske commits med begrunnelse
  - verifisering etter deloppgaver
  - sikkerhetsregler for secrets
  - krav om endringsrapport
- Opprettet `CHANGELOG.md` i Keep a Changelog-stil med `Unreleased`-seksjon.
- Opprettet denne notaten for hardening-praksis i `docs/engineering/`.
- BOM/encoding normalisert: UTF-8 BOM fjernet fra tekstfiler og linjeslutt satt til LF.
- Innfort Prettier med felles konfig i root og CI-sjekk for formattering.
- Dependabot aktivert for npm-avhengigheter og GitHub Actions (ukentlig oppdateringsflyt).
- Docker hardening: Postgres credentials flyttet til `.env`, `.env.example` bruker tydelige placeholders, og DB-port er bundet til localhost.
- Rate limit TTL unit clarified: bruker `RATE_LIMIT_TTL_MS` (ms) for entydig throttler-konfig.
- `/health + compose healthcheck`: API health-payload er utvidet, compose har healthcheck for API, og API-oppstart venter robust paa DB.
- Mobil-forst fundament er lagt: dev-login i mobil, mine jobber/detalj, arbeidsokter (start/pause/ferdig), draft timesheet, vedlegg metadata og notifikasjoner.
- Multi-tenant kontrakter er utvidet i `packages/shared` og haandheves for nye endepunkt i API.

## Hvordan verifisere

- Kjor kommandoene fra repo-root:

```bash
pnpm exec prettier . --write
pnpm exec prettier . --check
pnpm -w lint
pnpm -w typecheck
pnpm -w test
pnpm -w build
```

- CI:
  - `.github/workflows/ci.yml` kjorer `pnpm exec prettier . --check` for build.

- Forventet:
  - Kommandoene fullforer uten feil, eller
  - Eventuelle feil dokumenteres med kort arsak og videre tiltak.
