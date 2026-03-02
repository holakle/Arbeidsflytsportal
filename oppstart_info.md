# Oppstart (scan-pilot)

1. Kopier `.env.example` til `.env`.
2. Kopier `.env` til `apps/api/.env`.
3. Start DB: `docker compose up -d postgres`
4. Installer avhengigheter: `pnpm install`
5. Prisma:
   - `pnpm --filter @apps/api prisma:generate`
   - `pnpm --filter @apps/api prisma:migrate:dev`
   - `pnpm --filter @apps/api prisma:seed`
6. Sett `apps/web/.env.local`:
   - `NEXT_PUBLIC_API_URL=http://localhost:3001`
   - `NEXT_PUBLIC_DEV_TOKEN=<token>`
7. Start: `pnpm dev`
8. Åpne: `http://localhost:3000/scan`

## Mobil HTTPS (valgfritt)

- Caddy LAN:
  - `docker compose --profile https up -d https`
  - sett `NEXT_PUBLIC_API_URL=https://<LAN_HOST>/api`
- Cloudflare tunnel:
  - sett `CLOUDFLARE_TUNNEL_TOKEN` i `.env`
  - `docker compose --profile https --profile tunnel up -d https tunnel`


# 0) Hent repo
git clone https://github.com/holakle/Arbeidsflytsportal.git
cd Arbeidsflytsportal

# 1) Sikre riktig pnpm-versjon (repoet forventer pnpm@10.6.2)
corepack enable
corepack prepare pnpm@10.6.2 --activate
pnpm -v

# 2) Lag .env fra .env.example (repoets .env.example er én linje -> splitt til én variabel per linje)
(Get-Content .env.example -Raw) -split '\s+' | Where-Object { $_ } | Set-Content .env

# 3) Prisma CLI kjører fra apps/api, så legg env der også
Copy-Item .env apps/api/.env -Force

# 4) (Valgfritt men ryddig) Sett web sin .env.local (API-URL + valgfri fallback token)
@"
NEXT_PUBLIC_API_URL=http://localhost:3001
# NEXT_PUBLIC_DEV_TOKEN=
"@ | Set-Content apps/web/.env.local

# 5) Start Postgres
docker compose up -d postgres

# 6) Installer deps
pnpm install

# 7) Prisma (generate -> migrate -> seed)
pnpm --filter @apps/api prisma:generate
pnpm --filter @apps/api prisma:migrate:dev
pnpm --filter @apps/api prisma:seed

# 8) Start alt (turbo dev i parallell: api+web(+mobile+worker))
pnpm dev

# dglig oppstrt

cd Arbeidsflytsportal
docker compose up -d postgres
pnpm dev



# bare starte web+api:
docker compose up -d postgres
pnpm --filter @apps/api dev

# i en ny terminal:
pnpm --filter @apps/web dev

# stopp prossesser

ctrl +c i terminal

docker compose stop postgres