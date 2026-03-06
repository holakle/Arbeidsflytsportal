# INFO - Montasjeplattform (web + mobil)

## Formaal

Dette dokumentet er stabil referanse for arkitektur og prinsipper.
Operativ oppstart/drift finnes kun i [README.md](../README.md).

## Monorepo-struktur

- `apps/api`: NestJS API (RBAC + tenant + audit)
- `apps/web`: Next.js web (planner + dashboard)
- `apps/mobile`: Expo feltapp (mine ordre, timer, todo)
- `apps/worker`: bakgrunnsjobber (outbox/eksport/indeksering)
- `packages/shared`: Zod-first kontrakter + typed client
- `packages/ui`: felles UI-byggesteiner

## Domeneprinsipper

- `organizationId` er obligatorisk tenant-scope paa alle forretningsentiteter.
- `Project` er valgfri, flytende dimensjon (nullable) og skal ikke lase flyt/hierarki.
- `TimesheetEntry` kan knyttes til `workOrderId` og/eller `projectId` (begge nullable).

## Sikkerhetsprinsipper

- OIDC/OAuth2-adapter (dev JWT foerst, prod senere)
- RBAC guards + tenant enforcement paa alle routes
- Inputvalidering paa endpoints (Zod/class-validator)
- Rate limiting, CORS allowlist, secure headers
- Audit logg paa kritiske endringer (ordrestatus, assignment, booking, timesheet submit)

## MVP-scope

- Del 1: WorkOrders + Assignments + EquipmentReservations
- Del 4: Timesheets + Todo + Dashboard widgets
- Dashboard widgets: Mine ordre, Bookinger, Timer denne uken, Todo
- Utstyrstyper:
  - `EQUIPMENT`: bookbart utstyr
  - `CONSUMABLE`: forbruksmateriell registreres paa arbeidsordre

## Frontend-oversikt

- `/overview`: data explorer for validering av API-kontrakter
- `/dashboard`: personlige widgets med reelle data
- `/planner`: operativ planlegging med kalender via `/schedule`
- `/times`: timeliste, ny foring og ukesummering
- `/todos`: todo-liste, oppretting, status og sletting
- `/workorders/[id]`: redigering, planansvarlig, schedule entries og forbruksmateriell
- `/equipment`: utstyrsoversikt med filter og scanner-inngang

## Endringshistorikk

- Arkitektur-beslutninger: se `docs/adr/`
- Implementasjonshistorikk: se Git commits og PR-er

## Vedlikehold av denne filen

Oppdater kun ved endringer som paavirker:
- API-kontrakter og modulgrenser
- auth/claims-modell
- tenant-scope eller domeneprinsipper

## Neste steg

- Fiks nullability i `apps/api/src/modules/schedule/schedule.service.ts` (`entry.workOrder` kan vaere `null`) for aa faa `pnpm -w typecheck` og `pnpm -w build` tilbake til groen status.
