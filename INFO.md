# INFO — Montasjeplattform (web + mobil)

## Hva prosjektet er
Et tenant-basert, skalerbart system for arbeidsprosesser i montasjeselskap: arbeidsordre + ressursstyring + personlig arbeidsflate (timer/todo). Del 2 (avvik) og Del 3 (kvalitet/KB) kommer senere.

## Monorepo-struktur
- apps/api: NestJS API (RBAC + Tenant + Audit)
- apps/web: Next.js web (planner + dashboard)
- apps/mobile: Expo feltapp (mine ordre, timer, todo)
- apps/worker: bakgrunnsjobber (outbox/eksport/indeksering)
- packages/shared: Zod-first kontrakter + typed client
- packages/ui: felles UI-byggesteiner

## Domeneprinsipper (viktig)
- organizationId er obligatorisk tenant-scope på alle forretningsentiteter.
- Project er en valgfri, flytende dimensjon (nullable) og skal ikke låse flyt/hierarki.
- TimesheetEntry kan knyttes til workOrderId og/eller projectId (begge nullable) + activityType brukes ved “annet arbeid”.

## Sikkerhetsprinsipper
- OIDC/OAuth2-adapter (dev JWT først, prod senere)
- RBAC guards + Tenant enforcement på alle routes
- Inputvalidering på alle endpoints (Zod/class-validator)
- Rate limiting, CORS allowlist, secure headers
- Audit log på kritiske endringer (ordrestatus, assignment, booking, timesheet submit)

## MVP nå (Del 1 + Del 4)
- Del 1: WorkOrders + Assignments + EquipmentReservations
- Del 4: Timesheets + Todo + Dashboard widgets
- Dashboard widgets: Mine ordre, Bookinger, Timer denne uken, Todo

## Neste steg (Del 2 + Del 3)
- Del 2: Avvik + rapport/eksport via OutboxEvent + worker
- Del 3: Instrukser/KB + søk (intern indeks + eksterne connectors) + RAG/AI som eget subsystem

## Beslutningslogg
| Dato | Beslutning | Begrunnelse |
|---|---|---|
| 2026-03-01 | Project = optional floating dimension | Fleksibel rapportering uten å låse arbeidsflyt |
| 2026-03-01 | organizationId på alle entiteter | Hindrer tenant-lekkasje og forenkler skalering |
| 2026-03-01 | Zod-first kontrakter i packages/shared | Én kilde til sannhet for typer/validering |

## Hvordan oppdatere denne filen
- Oppdater ved alle endringer som påvirker: API-kontrakter, auth/claims, tenant-scope eller modulgrenser.
- Legg alltid inn en rad i Beslutningslogg samme dag.

