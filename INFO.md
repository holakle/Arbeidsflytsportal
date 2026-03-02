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
- Barcode lookup/attach er tenant-sikret med RBAC, service-validering og audit logging.

## MVP nå (Del 1 + Del 4 + V4/V5 planlegging)
- Del 1: WorkOrders + Assignments + EquipmentReservations
- Del 4: Timesheets + Todo + Dashboard widgets
- Dashboard widgets: Mine ordre, Bookinger, Timer denne uken, Todo
- Scan pilot (web): `/equipment/scan` med kamera-scanning, barcode-lookup og rollebasert barcode-attach.
- Utstyrstyper:
  - `EQUIPMENT`: bookbart utstyr.
  - `CONSUMABLE`: forbruksmateriell som registreres manuelt på arbeidsordre.
- Planner/schedule:
  - `Planansvarlig (planlegger)` settes per arbeidsordre.
  - `Tildelt arbeid (tidspunkt)` er egne schedule entries per arbeidsordre.

## Dev-login flyt
- I dev brukes `dev-auth` for rask rollebytte uten ekstern OIDC.
- Standardflyt:
  - Hent brukere: `GET /dev-auth/users`
  - Issuer token: `POST /dev-auth/token`
  - Lagre token i `portal_dev_token` cookie / localStorage (web)
- I produksjonsmodus skal `dev-auth`-ruter ikke eksistere (route-fravaer, ikke bare forbidden).

## Viktige env-flagg
- `ENABLE_DEV_AUTH`:
  - `true` i dev for lokal token-utstedelse.
  - `false` i produksjon sammen med `NODE_ENV=production`.
- `NEXT_PUBLIC_ENABLE_OVERVIEW`:
  - Lar `/overview` brukes som data/wireframe-side i kontrollerte miljoer.
  - Skal ikke brukes som permanent sluttbrukerflate.

## Hvorfor /overview finnes
- `/overview` er en one-page data explorer for:
  - rask validering av API-kontrakter
  - avdekking av widgetbehov for "Min side"
  - intern test av domeneantakelser uten full UI-polish.

## Arbeidsflyt mellom sider
- `/overview`:
  - analyserer data pa tvers og lar deg pinne widgets til dashboard.
- `/dashboard`:
  - viser personlige widgets med reelle data.
- `/planner`:
  - operativ planlegging (opprette arbeidsordre, tildele, booke utstyr).
  - kalender for mannskap/utstyr via `/schedule`.
- `/times`:
  - egen side for timeliste, ny føring og ukesummering.
- `/todos`:
  - egen side for todo-liste, oppretting, statusendring og sletting.
- `/workorders/[id]`:
  - redigering av arbeidsordre, planansvarlig, schedule entries og forbruksmateriell.
- `/equipment`:
  - utstyrsoversikt med typefilter og inngang til scanner på `/equipment/scan`.

## V4/V5 runbook (dev)
1. Synk DB og seed:
   - `pnpm --filter @apps/api exec prisma db push --accept-data-loss`
   - `pnpm --filter @apps/api prisma:seed`
2. Start API/web:
   - `pnpm --filter @apps/api dev`
   - `pnpm --filter @apps/web dev`
3. Planner-kalender:
   - bytt til `Kalender` i `/planner`
   - velg dato, ressurstype (`Mannskap`/`Utstyr`) og filter
4. Workorder planlegging:
   - åpne `/workorders/[id]`
   - sett `Planansvarlig (planlegger)`
   - legg til `Tildelt arbeid (tidspunkt)` og bekreft at event vises i planner-kalender
5. Consumable-flyt:
   - scan `CONSUMABLE` i `/equipment/scan` og registrer forbruk på arbeidsordre
   - verifiser at `CONSUMABLE` ikke kan bookes via `/equipment/reserve`

## Mobilscanning dev
- Mål: teste `/scan` fra iPhone/Android over HTTPS.
- Caddy LAN-oppsett:
  - Sett `LAN_HOST` i `.env`, for eksempel `workflow.local`.
  - Start proxy: `docker compose --profile https up -d https`
  - Sett web mot proxied API i `apps/web/.env.local`: `NEXT_PUBLIC_API_URL=https://<LAN_HOST>/api`
  - Installer Caddy sin lokale CA på mobil:
    - Eksporter root CA fra container: `docker cp workflow-https:/data/caddy/pki/authorities/local/root.crt ./root.crt`
    - Installer `root.crt` på enheten og stol på sertifikatet.
- Cloudflare tunnel (alternativ uten lokal CA):
  - Sett `CLOUDFLARE_TUNNEL_TOKEN` i `.env`.
  - Start: `docker compose --profile https --profile tunnel up -d https tunnel`
  - Bruk tildelt HTTPS-URL for mobil testing.

## Neste steg (Del 2 + Del 3)
- Del 2: Avvik + rapport/eksport via OutboxEvent + worker
- Del 3: Instrukser/KB + søk (intern indeks + eksterne connectors) + RAG/AI som eget subsystem

## Beslutningslogg
| Dato | Beslutning | Begrunnelse |
|---|---|---|
| 2026-03-01 | Project = optional floating dimension | Fleksibel rapportering uten å låse arbeidsflyt |
| 2026-03-01 | organizationId på alle entiteter | Hindrer tenant-lekkasje og forenkler skalering |
| 2026-03-01 | Zod-first kontrakter i packages/shared | Én kilde til sannhet for typer/validering |
| 2026-03-02 | Barcode-scan pilot via web `/scan` først | Rask mobil verifisering før native Expo-implementasjon |

## Hvordan oppdatere denne filen
- Oppdater ved alle endringer som påvirker: API-kontrakter, auth/claims, tenant-scope eller modulgrenser.
- Legg alltid inn en rad i Beslutningslogg samme dag.

