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
- `/health + compose healthcheck`: API health-payload er utvidet, compose har healthcheck for API, og API-oppstart venter robust på DB.

## Hvordan verifisere

- Kjor kommandoene fra repo-root:

```bash
pnpm -w format
pnpm -w format:check
pnpm -w lint
pnpm -w typecheck
pnpm -w test
pnpm -w build
```

- CI:
  - `.github/workflows/ci.yml` kjører `pnpm -w format:check` for build.

- Forventet:
  - Kommandoene fullforer uten feil, eller
  - Eventuelle feil dokumenteres med kort arsak og videre tiltak.
