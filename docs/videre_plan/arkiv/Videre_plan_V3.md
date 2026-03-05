Videre arbeid v3

## Statuslogg 2026-03-02

1. FULLFØRT: Planner UX med dropdowns, datetime-local, tydelig feil/suksess.
2. FULLFØRT: Dashboard widget-rendering med reelle API-kall.
3. FULLFØRT: Pinning fra overview til dashboard (GET/PUT dashboard).
4. FULLFØRT: Prod hardening-test for fravaer av dev-auth routes.
5. FULLFØRT: Docs oppdatert i INFO.md.
6. FULLFØRT: TryCloudflare tunnel oppe.
   URL: https://barriers-coaches-resumes-cottages.trycloudflare.com
7. FULLFØRT: Planner har beskrivelse ved oppretting av arbeidsordre.
8. FULLFØRT: Egen arbeidsordre-side med redigering: /workorders/[id].
9. FULLFØRT: Ny toppnivaa-side for utstyr: /equipment.
10. FULLFØRT: Scan flyttet under utstyr: /equipment/scan, /scan videresender.
11. FULLFØRT: Miljoe stabilisert ved DB-sync; /workorders, /dev-auth/users og /equipment svarer 200.

Mål for neste leveranse (2–3 PR/commit-bolker):

Gjøre /planner brukbar uten manuell copy/paste av IDs (dropdowns + dato-input + bedre feilhåndtering).

Gjøre /dashboard til en reell “Min side” med widget-rendering (MVP: Mine arbeidsordre, Bookinger, Timer denne uken, Todo).

Legge inn “Legg til på Min side” fra /overview (pin widget) – uten å bryte eksisterende GET/PUT /dashboard.

Hardening: liten e2e-test som beviser at /dev-auth/\* ikke finnes i prod-konfig.

0. Låste rammer (ikke diskuter, bare følg)

Dev-auth er kun for utvikling og skal være “route-fravær” når deaktivert (conditional module import).

/overview skal fortsette å være “alt på én side” for å teste data + widgetbehov.

Ikke introduser OIDC nå.

1. Planner UX v1 (mest verdi per time)

Problem i dag: Planner krever at bruker taster inn WorkOrder ID, Assignee User ID, Equipment ID manuelt.

Tiltak:

I apps/web/app/planner/page.tsx:

Hent workorders, users, equipment på mount:

apiClient(token).listWorkOrders(...)

(hvis klienten mangler) legg til listUsers() i shared ApiClient + API-endepunkt eksisterer allerede (repo har /users i API fra før – bruk den).

apiClient(token).listEquipment()

Bytt inputs til:

Dropdown for valgt arbeidsordre (title + status)

Dropdown for assignee user (displayName + rolle)

Dropdown for equipment item (name + serial)

Start/slutt: bruk datetime-local inputs og konverter til ISO før POST

Etter assign og reserve: refresh relevant lister og vis “toast/inline success”.

Aksept:

Planlegger kan opprette arbeidsordre, velge bruker fra liste, og booke utstyr uten å kopiere IDer.

Ved feil: tydelig tekst med status/årsaksinfo (fra exception).

Commit-forslag:
feat(web): make planner usable with dropdowns and date inputs

2. Dashboard widgets v1 (gjør “Min side” ekte)

Status i dag: /dashboard viser bare widget-titler og type, ikke data.

Tiltak (MVP, uten nytt API):

I apps/web/app/dashboard/page.tsx:

Render widgets som “cards” og hent data per widget-type:

MY_WORKORDERS: kall listWorkOrders med filter (hvis API støtter assignedToMe, bruk det; hvis ikke, legg til query-støtte i API senere)

BOOKINGS: kall listEquipmentReservations

HOURS_THIS_WEEK: kall weeklySummary()

TODO: kall listTodos

Lag en enkel WidgetRenderer-switch:

switch (w.type) -> egen komponent per widget-type

Behold ConnectionStatus badge (den er nyttig i dev).

Valgfritt men anbefalt:

Bytt dashboard til server-gate på samme måte som overview (les cookie token på server) for en mer konsistent opplevelse.

Aksept:

/dashboard viser reelle data for alle default widgets fra API.

Reload fungerer uten manuell setup (så lenge dev-login er gjort).

Commit-forslag:
feat(web): render real dashboard widgets using existing api

3. “Legg til på Min side” fra /overview (pin widget)

Mål: Fra hver seksjon i /overview skal man kunne legge til en relevant widget på dashboardet.

Teknisk strategi (uten nytt API-endepunkt):

Web gjør:

GET /dashboard

Muter widgets[] + layout lokalt

PUT /dashboard med ny payload (bruk apiClient(token).updateDashboard(...)).

Regler:

Ikke legg til duplikat-widget av samme type med samme “scope”.

Layout: append nederst (f.eks. y = maxY + 2, x=0, w=2, h=2).

UI:

I apps/web/app/overview/overview-client.tsx:

Legg til knapp “Legg til på Min side” per seksjon (WorkOrders, Reservations, Weekly summary, Todos).

Vis bekreftelse (“Lagt til”) og link til /dashboard.

Aksept:

Klikk “Legg til…” -> widget dukker opp på /dashboard etter refresh, uten å ødelegge eksisterende layout.

Commit-forslag:
feat(web): allow pinning overview sections to my dashboard

4. Prod-sikkerhet: e2e-test for route-fravær av dev-auth

Bakgrunn: DevAuthModule importeres conditionally. Vi vil bevise med test at routes ikke finnes i prod-konfig.

Tiltak (apps/api):

Lag en Vitest/Supertest e2e:

Start Nest app med NODE_ENV=production og ENABLE_DEV_AUTH=false

Assert GET /dev-auth/users => 404

Legg testen i apps/api/test/dev-auth.prod.e2e.spec.ts

Aksept:

Testen kjører i CI lokalt og beviser at dev-auth routes ikke registreres.

Commit-forslag:
test(api): assert dev-auth routes absent in production config

5. Docs (mini, men viktig)

Oppdater root INFO.md (eller README) med:

dev-login flyt

env flags (ENABLE_DEV_AUTH, NEXT_PUBLIC_ENABLE_OVERVIEW)

“hvorfor /overview finnes” (data/wireframe-siden)

Commit-forslag:
docs: update INFO with dev login and overview/dashboard workflow

Foreslått rekkefølge (for å holde det ryddig)

feat(web): make planner usable with dropdowns and date inputs

feat(web): render real dashboard widgets using existing api

feat(web): allow pinning overview sections to my dashboard

test(api): assert dev-auth routes absent in production config

docs: update INFO with dev login and overview/dashboard workflow

Videre arbeid:
V4 — Domene og API for planlegging (foundation)

1. Datamodell: separer planansvar og “schedule assignment”

Endring i DB/Prisma:

WorkOrder.planningOwnerUserId (nullable, men ønsket i Planner-flyt)

Ny tabell: WorkOrderSchedule

id, organizationId, workOrderId

assigneeUserId (nullable) / assigneeTeamId (nullable) XOR (samme mønster som assignment)

startAt, endAt (tstz)

note / status (optional)

indeks på (organizationId, assigneeUserId, startAt) osv.

Viktig: dette er ikke “assignment” i betydningen “ansvar/eiere” – det er kalenderplassering.

2. API-endepunkter (MVP)

Legg inn et dedikert “schedule”-API (enkelt å bruke fra kalender-widget og planner):

GET /schedule?from=...&to=...

default scope: “mine” (basert på token user)

for planner/admin: scope=all + filter param

returnerer en flat liste av ScheduleEvent:

type: workorder_schedule | equipment_reservation | personal_block (senere)

title, start, end

resourceRef (user/team/equipment)

workOrderRef (id + tittel + status)

POST /workorders/:id/planning-owner (eller del av workorder update)

POST /workorders/:id/schedule

body: { assigneeUserId|assigneeTeamId, startAt, endAt, note? }

DELETE /schedule/:id eller DELETE /workorders/:id/schedule/:scheduleId

RBAC:

vanlig bruker: kun lese egne schedule events

planner/admin: lese alle, skrive schedule for alle

3. Shared kontrakter

I packages/shared:

schedule.schema.ts: ScheduleEvent, ScheduleQuery, CreateScheduleRequest, etc.

ApiClient:

listSchedule(query)

setPlanningOwner(workOrderId, userId)

createWorkOrderSchedule(workOrderId, payload)

deleteWorkOrderSchedule(scheduleId)

Aksept V4

Planner kan hente schedule for en uke og få både workorder-schedule og utstyrsreservasjoner i samme respons.

Vanlig bruker får kun egne events (RBAC/tenant).

V5 — Planner: Kalender-visning + ressurs-oversikt 4) Planner UI: “List view” + “Calendar view”

I apps/web/app/planner:

Legg til toggle: “Liste” / “Kalender”

Kalender view (MVP):

velg uke/dato-intervall

filter:

ressurs-type: Mannskap | Utstyr

ressurs: (dropdown) “Alle” / spesifikk

viser events (schedule + reservations)

Kalenderbibliotekvalg (MVP)

Bruk (MIT) for uke/dag-view i MVP.

Ikke implementer resource timeline i V5 (for å unngå premium scheduler).

5. Planleggerflyt: tildel planansvar + tildel arbeider i tid

På WorkOrder detaljer i planner:

Velg Planansvarlig (planningOwner)

Legg til “Tildel arbeider/Team i tidsrom”

user/team dropdown

start/end (datetime)

submit -> POST /workorders/:id/schedule

Vis eksisterende schedule entries for ordren (liste) + slettknapp

Aksept V5

Planner kan:

sette planansvarlig

schedule en arbeider i et tidsrom

se eventene dukke opp i kalenderen

Planner kan bytte mellom “mannskap” og “utstyr” og se bookings.

V6 — “Min side” kalender-widget + egne sider for Timer og To-dos 6) Dashboard: Ny widget “Kalender (mine bookinger)”

Widget type: MY_CALENDAR

Konfig: rangeDays (f.eks. 14/30), showEquipment true/false

Data: GET /schedule?from=today&to=today+range

Aksept

Alle brukere ser en kalender-widget med fremtidige bookinger (workorder-schedule) og evt utstyrsreservasjoner knyttet til dem.

7. Egen side for Timer: /times

Toppnivå i meny, på nivå med planner/overview/dashboard

Funksjon:

liste timeregistreringer (dag/uke)

opprett ny entry (dato, timer, kommentar, workOrder optional, project optional)

ukesummering synlig

Bruk eksisterende endpoints (timesheets + weekly summary)

8. Egen side for To-dos: /todos

Liste + opprett + fullfør + slett

Filtrering: mine / team (om støttet)

UI skal være rask og “felt-vennlig”

Aksept V6

/times og /todos fungerer uten å gå via dashboard.

Dashboard fortsatt gir “quick view” via widgets.

Testing og sikkerhet (må med) 9) Minimum tester

API e2e:

vanlig bruker får ikke scope=all på schedule

planner/admin får

cross-tenant blokkeres

UI smoke:

dev-login -> planner -> schedule worker -> worker ser event i “Min side kalender”

Sikkerhetsnote: scheduling/planlegging er “business function” med høy risiko for tilgangsfeil, så dette må håndheves server-side.

Commit-pakker (anbefalt rekkefølge)

feat(api): add workorder planningOwner and schedule endpoints

feat(shared): add schedule schemas and client methods

feat(web): planner calendar view with schedule + reservations

feat(web): add /times and /todos top-level pages

feat(web): add my calendar widget on dashboard

test(api): e2e schedule RBAC and tenant isolation

Mini-tillegg: tydelig “rolle-splitt” i UI

I UI, bruk konsekvente labels:

“Planansvarlig (planlegger)” = planningOwner

“Tildelt arbeid (tidspunkt)” = schedule entries

Dette gjør modellen lett å forstå for alle.

## Statusoppdatering 2026-03-02 (V4/V5-betraktninger)

1. FULLFORT: Splitt av utstyrstyper i domene:

- EQUIPMENT (bookbar)
- CONSUMABLE (forbruksmateriell, ikke bookbar)

2. FULLFORT: Manuell forbruksforing pa arbeidsordre:

- API: GET/POST /workorders/:id/consumables
- Web: registrering og liste pa /workorders/[id]

3. FULLFORT: Scannerflyt oppdatert:

- funnet CONSUMABLE kan registreres direkte mot valgt arbeidsordre
- funnet EQUIPMENT beholder reserveringsflyt

## Statusoppdatering 2026-03-02 (V4 arbeid i gang)

1. FULLFORT: Datamodell utvidet med planlegging:

- WorkOrder.planningOwnerUserId
- WorkOrderSchedule (med assignee user/team, tidsrom, note, status)

2. FULLFORT: Nye API-endepunkter:

- GET /schedule?from=...&to=...&scope=mine|all
- POST /workorders/:id/planning-owner
- GET /workorders/:id/schedule
- POST /workorders/:id/schedule
- DELETE /workorders/:id/schedule/:scheduleId

3. FULLFORT: RBAC i schedule:

- scope=all kun planner/admin/system_admin
- mine-scope filtrerer pa user/team-tilgang

4. FULLFORT: Shared kontrakter/klient:

- schedule.schema.ts
- ApiClient: listSchedule, setPlanningOwner, create/delete/list workorder schedule

5. NOTAT: V5 kalender-visning i planner gjenstar fortsatt i UI-laget.

## Statusoppdatering 2026-03-02 (V5 fullfort i web)

1. FULLFORT: Planner har Liste/Kalender-toggle med schedule-data fra /schedule.
2. FULLFORT: Kalenderfilter for ressurstype (Mannskap/Utstyr) og spesifikk ressurs.
3. FULLFORT: Workorder-detalj har:

- Planansvarlig (planlegger)
- Tildelt arbeid (tidspunkt) opprett/slett
- visning av eksisterende schedule entries

4. FULLFORT: API e2e utvidet for schedule RBAC/tenant + consumables-regler.

## Kontekst (laast for pilot)

Rollestruktur:

- Planlegger: planlegger arbeidsoppdrag og har bred tilgang, men skal ikke kunne bookes pa jobber.
- Ressursstyrer: delegerer ressurser og booker, har bred tilgang.
- Montor: utforer arbeid og skal kunne bookes pa oppdrag.

Dummybrukere for pilot (realistiske navn + brukernavn):

- Ingrid Nilsen (brukernavn: ingrid.nilsen, rolle: planner)
- Martin Hagen (brukernavn: martin.hagen, rolle: org_admin / ressursstyrer)
- Ole Andersen (brukernavn: ole.andersen, rolle: technician)
- Sara Lunde (brukernavn: sara.lunde, rolle: technician)
- Jonas Berntsen (brukernavn: jonas.berntsen, rolle: technician)
- Maria Solberg (brukernavn: maria.solberg, rolle: member)
- Kristian Dahl (brukernavn: kristian.dahl, rolle: member)

Merknad:

- User-modellen har ikke eget username-felt. I pilot brukes e-post local-part som brukernavn (f.eks. ingrid.nilsen@demo.no -> ingrid.nilsen).

## Statusoppdatering 2026-03-02 (V7 timer/login/assign)

1. FULLFORT: Login/token-stabilitet forbedret i web:

- server-side API-base leses fra `INTERNAL_API_URL`/`SERVER_API_URL` (fallback localhost API)
- klientkall handterer `401` med auto logout + redirect til `/login?reason=invalid-token`

2. FULLFORT: `/times` UX oppdatert:

- WorkOrder og Project er dropdowns (project utledet fra workorders)
- Worker er auto for montor/member, dropdown for planner/admin/system_admin
- oppretting sender `userId` kun nar admin/planner forer pa vegne av andre

3. FULLFORT: API/shared for timesheets utvidet:

- `POST /timesheets`, `GET /timesheets`, `GET /timesheets/weekly-summary` stotter optional `userId`
- RBAC: kun planner/org_admin/system_admin kan foresporre/fore pa vegne av andre

4. FULLFORT: Planner assign/schedule 400-blokkering fjernet:

- rollebasert \"ikke bookbar\"-sjekk er fjernet i workorders service

5. NOTAT: Seed-IDer i repoet er ikke RFC-UUID. Input-validering er derfor gjort tolerant (`string().min(1)`) i relevante request-skjemaer for at flytene skal fungere med dagens data.
