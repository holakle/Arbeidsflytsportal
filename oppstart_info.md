# Oppstart (scan-pilot)

1. Kopier `.env.example` til `.env`.
2. Kopier `.env` til `apps/api/.env`.
3. Start DB: `pnpm infra:up`
4. Installer avhengigheter: `pnpm install`
5. Prisma:
   - `pnpm --filter @apps/api prisma:generate`
   - `pnpm --filter @apps/api prisma:migrate:dev`
   - `pnpm --filter @apps/api prisma:seed`
6. Sett `apps/web/.env.local`:
   - `NEXT_PUBLIC_API_URL=http://localhost:3001`
   - `NEXT_PUBLIC_DEV_TOKEN=<token>`
7. Start alt: `pnpm dev`
   - Merk: `pnpm dev` inkluderer mobile og kan feile pga Expo/Metro.
   - Anbefalt for PC/web: `pnpm dev:core`
8. Apne: `http://localhost:3000/scan`

## Anbefalt daglig flyt (core uten mobile)
1. Start DB: `pnpm infra:up`
2. Start API+web: `pnpm dev:core`
3. Verifiser:
   - API: `http://localhost:3001/health`
   - Web: `http://localhost:3000/login`
4. Start TryCloudflare ved behov: `pnpm tunnel:up`
5. Hent tunnel-URL: `docker logs workflow-tunnel --tail 80`

## Mobil HTTPS (valgfritt)
- Caddy LAN:
  - `docker compose --profile https up -d https`
  - sett `NEXT_PUBLIC_API_URL=https://<LAN_HOST>/api`
- Cloudflare tunnel:
  - `pnpm tunnel:up`

## Manuell oppstart uten scripts
```powershell
docker compose up -d postgres
pnpm --filter @apps/api dev
```

I ny terminal:

```powershell
pnpm --filter @apps/web dev
```

Stopp:

```powershell
ctrl +c
docker compose stop postgres
```
