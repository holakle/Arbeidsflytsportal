# Arbeidsflytsportal Monorepo

Produksjonsrettet monorepo med `pnpm workspaces` + `turborepo` for montasjeplattform (web + mobil), med fokus på Del 1 (arbeidsordre) og Del 4 (personlig arbeidsflate).

## Stack
- `apps/api`: NestJS + Prisma + Postgres
- `apps/web`: Next.js App Router + Tailwind
- `apps/mobile`: Expo React Native
- `apps/worker`: Node/TS bakgrunnsjobb-runner
- `packages/shared`: Zod-first kontrakter + typed API client
- `packages/ui`: enkle delte UI-byggesteiner

## Multi-tenant og domene
- `organizationId` er obligatorisk tenant-scope på alle forretningsentiteter.
- `Project` er flytende/valgfri dimensjon (nullable), uten tvunget hierarki.
- `WorkOrder` og `TimesheetEntry` støtter nullable `projectId`.
- `Department` og `Location` er også valgfrie dimensjoner.

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
- `GET /equipment`
- `POST /equipment/reserve`
- `GET/POST/PATCH/DELETE /timesheets`
- `GET /timesheets/weekly-summary`
- `GET/POST/PATCH/DELETE /todos`
- `GET/PUT /dashboard`

## Lokal oppstart
1. Kopier `.env.example` til `.env` og juster ved behov.
2. Kopier `.env` til `apps/api/.env` for Prisma CLI lokalt:
   - `Copy-Item .env apps/api/.env` (PowerShell)
3. Start database:
   - `docker compose up -d postgres`
4. Installer avhengigheter:
   - `pnpm install`
5. Prisma:
   - `pnpm --filter @apps/api prisma:generate`
   - `pnpm --filter @apps/api prisma:migrate:dev`
   - `pnpm --filter @apps/api prisma:seed`
6. Kjør alt:
   - `pnpm dev`

## Dev token (lokal auth)
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

## Kvalitet
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## CI
GitHub Actions workflow: `.github/workflows/ci.yml`

