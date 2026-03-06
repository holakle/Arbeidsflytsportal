# INFO - Montasjeplattform (web + mobil)

## Hva prosjektet er

Et tenant-basert system for arbeidsprosesser i montasjeselskap: arbeidsordre, ressursstyring og personlig arbeidsflate (timer/todo). Del 2 (avvik) og Del 3 (kvalitet/KB) kommer senere.

## Monorepo-struktur

- apps/api: NestJS API (RBAC + tenant + audit)
- apps/web: Next.js web (planner + dashboard)
- apps/mobile: Expo feltapp (mine ordre, timer, todo)
- apps/worker: bakgrunnsjobber (outbox/eksport/indeksering)
- packages/shared: Zod-first kontrakter + typed client
- packages/ui: felles UI-byggesteiner

## Domeneprinsipper

- `organizationId` er obligatorisk tenant-scope pa alle forretningsentiteter.
- `Project` er valgfri, flytende dimensjon (nullable) og skal ikke lase flyt/hierarki.
- `TimesheetEntry` kan knyttes til `workOrderId` og/eller `projectId` (begge nullable).

## Sikkerhetsprinsipper

- OIDC/OAuth2-adapter (dev JWT forst, prod senere)
- RBAC guards + tenant enforcement pa alle routes
- Inputvalidering pa alle endpoints (Zod/class-validator)
- Rate limiting, CORS allowlist, secure headers
- Audit log pa kritiske endringer (ordrestatus, assignment, booking, timesheet submit)

## MVP na

- Del 1: WorkOrders + Assignments + EquipmentReservations
- Del 4: Timesheets + Todo + Dashboard widgets
- Dashboard widgets: Mine ordre, Bookinger, Timer denne uken, Todo
- Utstyrstyper:
  - `EQUIPMENT`: bookbart utstyr
  - `CONSUMABLE`: forbruksmateriell registreres pa arbeidsordre

## Arbeidsflyt mellom sider

- `/overview`: data explorer for validering av API-kontrakter
- `/dashboard`: personlige widgets med reelle data
- `/planner`: operativ planlegging med kalender via `/schedule`
- `/times`: timeliste, ny foring og ukesummering
- `/todos`: todo-liste, oppretting, status og sletting
- `/workorders/[id]`: redigering, planansvarlig, schedule entries og forbruksmateriell
- `/equipment`: utstyrsoversikt med filter og scanner-inngang

## Mobilscanning i web dev

- Mal: teste `/scan` fra iPhone/Android over HTTPS.
- Caddy LAN-oppsett:
  - sett `LAN_HOST` i `.env`
  - start proxy: `docker compose --profile https up -d https`
  - sett `NEXT_PUBLIC_API_URL=https://<LAN_HOST>/api` i `apps/web/.env.local`
- Cloudflare tunnel:
  - sett `CLOUDFLARE_TUNNEL_TOKEN` i `.env`
  - start: `docker compose --profile https --profile tunnel up -d https tunnel`

## Neste steg

- Del 2: Avvik + rapport/eksport via OutboxEvent + worker
- Del 3: Instrukser/KB + sok (intern indeks + eksterne connectors) + RAG/AI som eget subsystem
- Verifisering pa `hardening/mobile-field-parity-v2`:
  - `pnpm -w typecheck`, `pnpm -w test` og `pnpm -w build` feiler forelopig i `@apps/api`
  - feil: Prisma EPERM ved rename av `query_engine-windows.dll.node`
  - neste steg: stoppe prosess som holder fila last og kjor kommandoene pa nytt

## Beslutningslogg

| Dato       | Beslutning                            | Begrunnelse                                           |
| ---------- | ------------------------------------- | ----------------------------------------------------- |
| 2026-03-01 | Project = optional floating dimension | Fleksibel rapportering uten a lase arbeidsflyt        |
| 2026-03-01 | organizationId pa alle entiteter      | Hindrer tenant-lekkasje og forenkler skalering        |
| 2026-03-01 | Zod-first kontrakter i shared         | En kilde til sannhet for typer og validering          |
| 2026-03-02 | Barcode-scan pilot via web `/scan`    | Rask mobil verifisering for native Expo-implementasjon |

## Hvordan oppdatere denne filen

- Oppdater ved endringer som pavirker API-kontrakter, auth/claims, tenant-scope eller modulgrenser.
- Legg inn en ny rad i beslutningsloggen samme dag.
