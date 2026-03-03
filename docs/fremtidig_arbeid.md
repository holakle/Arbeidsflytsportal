# Fremtidig arbeid

## Cloudflare tunnel med fast domene (token-basert)

Vi kjører nå `trycloudflare` for rask mobiltesting uten token.

For stabil URL og produksjonsnær tunnel senere:

1. Opprett tunnel i Cloudflare Zero Trust.
2. Knytt tunnel til ønsket hostname (f.eks. `scan.dittdomene.no`).
3. Hent `CLOUDFLARE_TUNNEL_TOKEN`.
4. Legg token i root `.env`:

```env
CLOUDFLARE_TUNNEL_TOKEN=<sett-inn-token-her>
```

5. Bytt `docker-compose.yml` tunnel-kommando tilbake til token-modus:

```yaml
command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
```

6. Start tunnel:

```powershell
docker compose --profile https --profile tunnel up -d https tunnel
```

## Notat

- Behold `NEXT_PUBLIC_API_URL=/api` i web for å bruke samme origin bak Caddy/tunnel.
- Ved overgang til fast tunnel kan `trycloudflare`-kommando fjernes.
