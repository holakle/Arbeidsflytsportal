# AGENTS.md

Dette dokumentet beskriver standard arbeidsflyt for Codex i dette repoet.

## Branch-strategi

- Opprett alltid ny branch før endringer.
- Navn: `hardening/<kort-navn>`.
- Unngå direkte arbeid på `main`.

## Commit-strategi

- Lag små, atomiske commits.
- Hver commit-melding skal forklare:
  - hva som er endret
  - hvorfor endringen er gjort
- Unngå "samle-commits" med blandede tema.

## Verifisering etter deloppgaver

- Etter hver deloppgave, kjør relevante kommandoer og noter resultat:
  - `pnpm -w lint`
  - `pnpm -w typecheck`
  - `pnpm -w test` (hvis test-oppsett finnes)
  - `pnpm -w build` (når rimelig)
- Rapporter kort: pass/fail + evt. viktig feilmelding.

## Sikkerhet / secrets

- Legg aldri hemmeligheter i git.
- Aldri skriv faktiske passord, nøkler eller tokens i kode, docs eller commit-meldinger.
- Bruk miljøvariabler og eksempel-filer (f.eks. `.env.example`) uten ekte verdier.

## Konfigurasjon, CI og formatendringer

- Når konfig/CI/format endres:
  - oppdater `CHANGELOG.md`
  - oppdater relevant dokumentasjon i `docs/` ved behov

## Sluttrapport i terminal-output

- Avslutt alltid med en "Endringsrapport" som inkluderer:
  - liste over filer som er endret
  - kort begrunnelse per fil eller endringsgruppe
