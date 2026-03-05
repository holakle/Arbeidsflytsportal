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
- Hvis en oppgave i plan ikke går gjennom/fullføres, legg denne inn under :
  docs/ INFO.md under: "## Neste steg " 

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
- Ved større endringer som krever restart av API/WEB skal du når commit er utført og plan fullført sjekke om web+api er oppe+ kjøre opp cloudflare+ sende cloudflare link

## Avhengighetsfeil (node_modules) - policy

- Ikke slett hele `node_modules` som first response ved feil i en enkelt pakke.
- Foretrukket recovery-rekkefolge:
  - 1) stopp prosesser som kan låse filer (`node`, `pnpm`, dev-servere)
  - 2) kjor `pnpm install --filter <pakke> --force` for berørt workspace
  - 3) kjør malrettet reinstall (`pnpm --filter <pakke> add ...`) eller `pnpm rebuild` for berorte pakker
  - 4) kjor full `pnpm install --force` kun hvis stegene over feiler
- Full sletting av `node_modules` skal kun brukes som siste utvei, og alltid dokumenteres i statusrapport med arsaken.

## Master prompt: Planhandtering

- Nye brukerplaner skal lagres i docs/videre_plan/planer/ med filnavn:
  - YYYY-MM-DD-kort-navn.md
- Aktiv planoversikt skal kun ligge i:
  - docs/videre_plan/videre_plan.md
- Struktur i aktiv planoversikt:
  - Statusoppdatering (fullfort) skal sta overst med korte linjer + dato
  - Gjenstar skal sta under og kun inneholde aktive punkter
- Nar en plan er fullfort:
  - flytt punktet ut av Gjenstar
  - legg inn kort statuslinje med fullfort-dato i Statusoppdatering (fullfort)
- Lange historiske plantekster skal arkiveres i:
  - docs/videre_plan/arkiv/
- docs/fremtidig_arbeid.md beholdes som langsiktig backlog, men ikke som aktiv gjennomforingsliste.
