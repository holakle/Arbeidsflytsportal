# Videre oppsett v2: Feltbruker-paritet mellom web og app

## Sammendrag

Mobil skal speile web-dashboard for feltbruk, ikke planleggerflyt. Prioritet er hva innlogget bruker faktisk skal gjore i felt: egne oppgaver, egen kalender, timer (auto + manuell), og rask scan/booking av utstyr.

## Implementasjonsendringer (fase 1)

- Mobil `Oversikt` renderer `GET /dashboard` widgets i web-rekkefolge.
- Feltfokus i navigasjon:
  - Oversikt
  - Kalender (mine)
  - Mine arbeidsordre
  - Timer
  - Utstyr
- Kalender:
  - alltid `scope=mine`
  - kun egen ressurs i fase 1
- Mine arbeidsordre:
  - liste med direkte apning
  - lagrer `lastOpenedWorkOrderId`
- Timer:
  - behold Start/Pause/Ferdig
  - manuell redigering av utkast for innsending
- Utstyr:
  - native scan + manuell kodefallback
  - booking for `EQUIPMENT`
  - default knyttet jobb:
    - aktiv jobbsesjon
    - ellers sist apnet arbeidsordre
    - ellers tomt valg
  - manuell overstyring av jobbvalg
  - eksplisitt valg "Uten arbeidsordre"

## API/kontrakter uten nye endpoints

- Ingen nye offentlige endpoints.
- Backward-compatible utvidelse av `POST /equipment/reserve`:
  - `workOrderId` optional/nullable i request
  - `workOrder`/`workOrderId` nullable i response
- Datamodell:
  - `EquipmentReservation.workOrderId` nullable relation
- Eventuelle dashboard-felt kun additive.

## Ustabil dekning: Pending operations-ko

- Lokal persisted ko for:
  - scan lookup
  - utstyrbooking
  - timesheet create/update
- Operasjonsmodell:
  - `id`, `type`, `payload`, `attemptCount`, `lastError`, `createdAt`, `updatedAt`, `nextRetryAt`, `status`
- Retry:
  - ved app-start
  - ved app foreground
  - periodisk auto-retry
  - manuell "Retry alle"
  - eksponentiell backoff + maks forsok
- UI:
  - status badges `Pending | Synced | Failed`
  - egen synkstatus-side med filter

## Web->app synk og parity-gate

- `widgetTypes` fra `@portal/shared` brukes som kilde.
- Mobil widget-mapping er uttommende.
- Parity-test feiler hvis en shared widgettype mangler mobil-stotte.

## Testplan (fase 1)

- Android emulator + iOS simulator.
- Scenarier:
  1. Dashboard i mobil speiler web-widgetrekkefolge.
  2. Kalender viser kun innlogget bruker.
  3. Booking default jobb prioriterer aktiv sesjon -> sist apnet -> tom.
  4. Booking uten arbeidsordre fungerer.
  5. Offline-operasjoner far status Pending/Synced/Failed med retry.
  6. Parity-test fanger manglende widgetstotte.

## Notat

- UI-justering fra bruker lagt til under gjennomforing:
  - topp hoyre knapper for innstillinger, varsler og hamburgermeny pa mobil-oversikt
  - hamburgermeny satt apen som standard inntil videre innhold detaljstyres
