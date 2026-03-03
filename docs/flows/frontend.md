flowchart TD
  %% ============ ENTRY / AUTH ============
  U[(Bruker)] --> L[Åpner Web]
  L --> A{Har token?}
  A -- Nei --> T[Dev token / OIDC login]
  T --> A
  A -- Ja --> ME[GET /me]
  ME --> D[Dashboard / Min arbeidsflate]

  %% ============ GLOBAL NAV ============
  D --> WO[Arbeidsordre]
  D --> TS[Timer]
  D --> TDOS[To-dos]
  D --> EQ[Utstyr]
  D --> DB[Dashboard-innstillinger]

  %% ============ WORK ORDERS ============
  subgraph WO_FLOW[Arbeidsordre-modul]
    WO --> WO_LIST[Liste/oversikt]
    WO_LIST --> WO_OPEN[Åpne arbeidsordre]
    WO_LIST --> WO_NEW[Ny arbeidsordre]
    WO_OPEN --> WO_EDIT[Endre detaljer]
    WO_OPEN --> WO_ASSIGN[Tildel person/tidspunkt]
    WO_OPEN --> WO_DELETE[Slett]
    WO_ASSIGN --> CAL[Planner/Kalender-visning]
  end

  %% ============ TIMESHEETS ============
  subgraph TS_FLOW[Timer-modul]
    TS --> TS_WEEK[Ukevisning]
    TS_WEEK --> TS_ADD[Legg inn timeføring]
    TS_WEEK --> TS_EDIT[Endre/juster]
    TS_WEEK --> TS_SUM[Ukessammendrag]
    TS_WEEK --> TS_DELETE[Slett]
  end

  %% ============ TODOS ============
  subgraph TODO_FLOW[To-dos-modul]
    TDOS --> TODO_LIST[Liste]
    TODO_LIST --> TODO_NEW[Ny to-do]
    TODO_LIST --> TODO_TOGGLE[Ferdig/ikke ferdig]
    TODO_LIST --> TODO_EDIT[Rediger]
    TODO_LIST --> TODO_DELETE[Slett]
  end

  %% ============ EQUIPMENT ============
  subgraph EQ_FLOW[Utstyr-modul]
    EQ --> EQ_LIST[Liste/tilgjengelighet]
    EQ_LIST --> EQ_DETAIL[Detaljside]
    EQ_DETAIL --> EQ_RESERVE[Reserver]
    EQ_DETAIL --> EQ_RELEASE[Frigi (via reserve-flow/oppdatering)]
  end

  %% ============ DASHBOARD ============
  subgraph DASH_FLOW[Dashboard]
    DB --> DASH_GET[Hent oppsett]
    DASH_GET --> DASH_PUT[Lagre oppsett]
  end

  %% ============ API CALL OUTS ============
  WO_LIST -.-> API_WO_LIST[GET /workorders]
  WO_NEW -.-> API_WO_NEW[POST /workorders]
  WO_OPEN -.-> API_WO_GET[GET /workorders/:id]
  WO_EDIT -.-> API_WO_PATCH[PATCH /workorders/:id]
  WO_DELETE -.-> API_WO_DEL[DELETE /workorders/:id]
  WO_ASSIGN -.-> API_WO_ASSIGN[POST /workorders/:id/assign]

  EQ_LIST -.-> API_EQ[GET /equipment]
  EQ_RESERVE -.-> API_EQ_RES[POST /equipment/reserve]

  TS_WEEK -.-> API_TS_LIST[GET /timesheets]
  TS_ADD -.-> API_TS_POST[POST /timesheets]
  TS_EDIT -.-> API_TS_PATCH[PATCH /timesheets]
  TS_DELETE -.-> API_TS_DEL[DELETE /timesheets]
  TS_SUM -.-> API_TS_SUM[GET /timesheets/weekly-summary]

  TODO_LIST -.-> API_TODO_LIST[GET /todos]
  TODO_NEW -.-> API_TODO_POST[POST /todos]
  TODO_EDIT -.-> API_TODO_PATCH[PATCH /todos]
  TODO_DELETE -.-> API_TODO_DEL[DELETE /todos]

  DASH_GET -.-> API_DASH_GET[GET /dashboard]
  DASH_PUT -.-> API_DASH_PUT[PUT /dashboard]

<!-- AUTO_ROUTES_START -->

## Auto-genererte routes

```mermaid
flowchart TD
  A[Start] --> B[App]
  B --> R0[/dashboard]
  B --> R1[/employees/[id]]
  B --> R2[/equipment]
  B --> R3[/equipment/[id]]
  B --> R4[/equipment/scan]
  B --> R5[/login]
  B --> R6[/mannskap]
  B --> R7[/overview]
  B --> R8[/planner]
  B --> R9[/scan]
  B --> R10[/times]
  B --> R11[/todos]
  B --> R12[/workorders]
  B --> R13[/workorders/[id]]
```

> Denne seksjonen er auto-generert av `docs/flows/scripts/gen-routes-mermaid.mjs`.
<!-- AUTO_ROUTES_END -->