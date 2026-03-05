# Videre plan

## Statusoppdatering (fullfort)

- 2026-03-05: Kalender drag/drop-respons hardnet med type-guard, endpoint-spesifikk feilkontekst og state-sync for valgt hendelse.
- 2026-03-05: Kalender booking-dialog stabilisert med pre-validering, endpoint-spesifikk feiltekst og overlap-flag for "Book likevel".
- 2026-03-04: Planstruktur ryddet opp i docs/videre_plan/ - ny aktiv hovedfil, planmappe og arkiv etablert.
- 2026-03-02: Planner UX v1 forbedret med dropdowns, datetime-input og tydeligere feil/suksessflyt.
- 2026-03-02: Dashboard widget-rendering aktivert med reelle API-kall.
- 2026-03-02: Pinning fra oversikt til Min side (dashboard) etablert.
- 2026-03-02: Egen arbeidsordreside med redigering lagt inn pa /workorders/[id].
- 2026-03-02: Utstyrsside og scan-flyt flyttet til /equipment og /equipment/scan.
- 2026-03-02: TryCloudflare testtunnel verifisert i dev-miljo.

## Gjenstar

### Mobil

- Stabiliser Expo-mobile slik at login -> mine jobber -> detalj fungerer uten runtime-feil.
- Oppgrader/tilpass avhengigheter rundt SDK 54 pa en kontrollert mate (uten regresjon i token/secure-store).
- Verifiser aktiv sesjonsflyt for start/pause/ferdig pa mobil.

### Kalender og planlegging

- Legg inn robust sletting fra kalenderhendelser (hover + klikkbar soppelkasse) med bekreftelse.

### Generell CRUD-opprydding

- Utvide slettingsmuligheter pa detaljsider for personell, utstyr og arbeidsordre (med guardrails).
- Fortsette spravask/oversettelseslop (norsk standard + valgfri engelsk i toppbar) uten a bryte eksisterende flyt.

### Drift

- Fortsette tunnel/driftsrutine med tydelig restart-flyt ved nettverksbrudd.
- Evaluer senere overgang fra trycloudflare til token-basert fast domene (se docs/fremtidig_arbeid.md).

## Planer mottatt

- [2026-03-04-opprydding-plan-dokumentasjon](./planer/2026-03-04-opprydding-plan-dokumentasjon.md)

## Arkiv

- [Videre_plan_V3](./arkiv/Videre_plan_V3.md)
