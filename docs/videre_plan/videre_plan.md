# Videre plan

## Statusoppdatering (fullfort)

- 2026-03-06: Mobil feltflyt v2 fase 1 levert med dashboard-widgetparitet, mine-kalender, mine arbeidsordre, timer (auto + manuell), utstyrscan/booking, pending operations-ko, synkstatus-side og topp-hoyre handlinger (innstillinger/varsler/hamburgermeny).
- 2026-03-06: Delordrer er innført på arbeidsordre, med egen delordreside og automatisk generering av hovedkode/delordrekode for timeføring.
- 2026-03-05: Kalender-bookingmodal viser nå kompetansefilter + ledig/ikke ledig i valgt tidsrom per ansatt.
- 2026-03-05: Utstyrssiden har fått inline redigering av reservasjoner (start/slutt med Lagre/Avbryt).
- 2026-03-05: Min side/oversikt bruker nå "Reservasjoner" som navn, og reservasjonslenker prioriterer utstyrssiden.
- 2026-03-05: Arbeidsordreside viser tydelig "Arbeidsordre-ID" og bruker navnebaserte dropdowns for avdeling/lokasjon/prosjekt.
- 2026-03-05: Timer/Føringer har fått kolonnene Arbeidsordre + Ordrenummer, og redigeringsmodus per føring (Lagre/Avbryt).
- 2026-03-05: Min side-widgetene for Mine arbeidsordre og Bookinger er gjort klikkbare med navigering til arbeidsordre/utstyr/planner.
- 2026-03-05: Ansattprofil utvidet med strukturert kompetanse (førerkort/kurs), utløpsdato og filterbar kompetansedata i Mannskap + Kalender-booking.
- 2026-03-05: Arbeidsordre-oppretting har fått kartstøtte (GPS/lenke) og vedleggsopplasting ved opprettelse, samt kartlenke inne på arbeidsordre-detalj.
- 2026-03-05: Todo-liste har fått inline redigering (tittel, forfall og beskrivelse) med Lagre/Avbryt per rad.
- 2026-03-05: Times-siden fikset ved å bruke `workorders`-limit innenfor API-kontrakt (100), som fjernet 500-feilen og ga arbeidsordrevalg tilbake.
- 2026-03-05: Arbeidsøkt på arbeidsordresiden viser nå registrert varighet i tt:mm ved avslutning (ikke draft-ID).
- 2026-03-05: Kalender delete-flyt hardnet med fallback-oppslag av workorder-id, race-guard og endpoint-spesifikk feilkontekst.
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

- Finjustere innhold og handlinger i hamburgermeny pa mobil (fase 2 UX).
- Utvide synkstatus med konflikt-handtering per operasjon (rediger/retry enkeltrad).
- Vurdere parity-gate i egen CI-jobb med eksplisitt feilmelding for dashboard-response mismatch.

### Generell CRUD-opprydding

- Utvide slettingsmuligheter pa detaljsider for personell, utstyr og arbeidsordre (med guardrails).
- Fortsette spravask/oversettelseslop (norsk standard + valgfri engelsk i toppbar) uten a bryte eksisterende flyt.

### Drift

- Fortsette tunnel/driftsrutine med tydelig restart-flyt ved nettverksbrudd.
- Evaluer senere overgang fra trycloudflare til token-basert fast domene (se docs/fremtidig_arbeid.md).

## Planer mottatt

- [2026-03-04-opprydding-plan-dokumentasjon](./planer/2026-03-04-opprydding-plan-dokumentasjon.md)
- [2026-03-06-feltbruker-paritet-v2](./planer/2026-03-06-feltbruker-paritet-v2.md)
- [endringsonsker-logg](./planer/endringsonsker-logg.md)

## Arkiv

- [Videre_plan_V3](./arkiv/Videre_plan_V3.md)
