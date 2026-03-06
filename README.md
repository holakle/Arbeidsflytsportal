# Arbeidsflytsportal Monorepo

Produksjonsrettet monorepo med `pnpm workspaces` + `turborepo` for montasjeplattform (web + mobil), med fokus paa Del 1 (arbeidsordre) og Del 4 (personlig arbeidsflate).

## Stack

- `apps/api`: NestJS + Prisma + Postgres
- `apps/web`: Next.js App Router + Tailwind
- `apps/mobile`: Expo React Native
- `apps/worker`: Node/TS bakgrunnsjobb-runner
- `packages/shared`: Zod-first kontrakter + typed API client
- `packages/ui`: enkle delte UI-byggesteiner

## Multi-tenant og domene

- `organizationId` er obligatorisk tenant-scope paa alle forretningsentiteter.
- `Project` er flytende/valgfri dimensjon (nullable), uten tvunget hierarki.
- `WorkOrder` og `TimesheetEntry` stoetter nullable `projectId`.
- `Department` og `Location` er ogsaa valgfrie dimensjoner.

## Sikkerhet

- Dev JWT OIDC-adapter (forberedt for Auth0/Entra/Clerk senere)
- RBAC (`system_admin`, `org_admin`, `planner`, `technician`, `member`)
- Tenant enforcement i guards
- Inputvalidering med Zod-kontrakter fra `@portal/shared`
- Rate limiting, CORS allowlist, secure headers (helmet)
- Audit logg for kritiske hendelser

## API-endepunkter (MVP)

- `GET /health`
- `GET /me`
- `GET/POST/GET:id/PATCH:id/DELETE:id /workorders`
- `POST /workorders/:id/assign`
- `POST /workorders/:id/start|pause|finish`
- `GET /workorders/:id/attachments`
- `POST /workorders/:id/attachments`
- `GET /equipment`
- `GET /equipment/lookup?code=...`
- `POST /equipment/:id/barcode`
- `POST /equipment/reserve`
- `GET/POST/PATCH/DELETE /timesheets`
- `GET /timesheets/weekly-summary`
- `GET/POST/PATCH/DELETE /todos`
- `GET/PUT /dashboard`
- `GET /schedule`
- `POST /schedule`
- `PATCH /schedule/:id`
- `GET /notifications`
- `POST /notifications/read`
- `GET /me/sessions/active`

## Operativ runbook

README er operativ single source of truth for oppstart, daglig drift, tunnel og shutdown.

### Foerste oppstart

1. Kopier `.env.example` til `.env` og sett lokale verdier.
2. Kopier `.env` til `apps/api/.env` for Prisma lokalt:
   - `Copy-Item .env apps/api/.env`
3. Installer avhengigheter:
   - `pnpm install`
4. Start database:
   - `pnpm infra:up`
5. Kjoer Prisma-oppsett:
   - `pnpm --filter @apps/api prisma:migrate:dev`
   - `pnpm --filter @apps/api prisma:seed`
6. Start standard lokal utvikling:
   - `pnpm dev`
7. Verifiser:
   - API: `http://localhost:3001/health`
   - Web: `http://localhost:3000/login`

### Daglig lokal utvikling (standard)

1. Start database: `pnpm infra:up`
2. Start API + web: `pnpm dev`
3. Valgfritt ved behov for mobil samtidig: `pnpm dev:all`

### Core dev-flyt

- Standard core-flyt er `pnpm dev` (API + web).
- Full flyt med API + web + mobile er `pnpm dev:all`.

### Dev token (lokal auth)

Generer et dev JWT med claims som matcher seed-data (`planner@demo.no`):

```bash
node -e "const jwt=require('jsonwebtoken'); console.log(jwt.sign({sub:'22222222-2222-2222-2222-222222222222',email:'planner@demo.no',displayName:'Planner Demo',organizationId:'11111111-1111-1111-1111-111111111111',roles:['planner']}, process.env.JWT_SECRET||'change-this-dev-secret',{issuer:process.env.JWT_ISSUER||'workflow-dev',audience:process.env.JWT_AUDIENCE||'workflow-clients',expiresIn:'8h'}))"
```

Bruk token i:

- Web: `NEXT_PUBLIC_DEV_TOKEN`
- Mobile: lagre token i SecureStore
- API-kall: `Authorization: Bearer <token>`

Opprett `apps/web/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_DEV_TOKEN=<token>
```

### Ekstern demo / tunnel (ved behov)

1. Bekreft at API og web kjoerer lokalt (`pnpm dev`).
2. Sett `CLOUDFLARE_TUNNEL_TOKEN` i `.env`.
3. Start tunnel: `pnpm tunnel:up`.
4. Hent ekstern URL: `docker logs workflow-tunnel --tail 80`.

### Mobil scanning over HTTPS (dev)

- LAN med Caddy (lokalt sertifikat):
  - Sett `LAN_HOST` i `.env`, for eksempel `workflow.local`
  - Start: `docker compose --profile https up -d https`
  - Sett `NEXT_PUBLIC_API_URL=https://<LAN_HOST>/api` i `apps/web/.env.local`
- Tunnel uten lokal CA:
  - Sett `CLOUDFLARE_TUNNEL_TOKEN` i `.env`
  - Start: `pnpm tunnel:up`

### Shutdown (standard)

1. Stopp utviklingsprosesser (`Ctrl+C` i terminal for `pnpm dev` / `pnpm dev:all`).
2. Hvis tunnel kjoerer: `pnpm tunnel:down`.
3. Stopp lokal database: `docker compose stop postgres`.

### Prisma feilsoking (avansert)

- `pnpm --filter @apps/api prisma:generate` brukes kun ved klient-synkproblemer.
- Ved inkonsistent lokal migrasjonshistorikk: `pnpm --filter @apps/api exec prisma migrate reset --force`.

## Kvalitet

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## CI

GitHub Actions workflow: `.github/workflows/ci.yml`