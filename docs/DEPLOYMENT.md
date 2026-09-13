# Deployment — Patana Booking

## Environments

| Env | DB | How |
|-----|----|-----|
| **local** | Docker Compose `patana-postgres` | `docker compose up -d` + `prisma db push` + `db:seed` |
| **staging** | Managed Postgres (e.g., Neon, RDS, Supabase) | `DATABASE_URL` secret, `prisma migrate deploy` in CI |
| **prod** | Managed Postgres, backups enabled | Same as staging, plus read replica if needed |

## Env Vars

| Var | Required | Example |
|-----|----------|---------|
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/patana?schema=public` |
| `JWT_SECRET` | Yes (when auth wired) | `openssl rand -base64 32` |
| `PORT` | No | `3000` |
| `NODE_ENV` | No | `production` |

Never commit `.env`. Use platform secrets (Vercel env, GitHub Actions secrets, etc.).

## Docker Postgres (local)

`docker-compose.yml` runs `postgres:16-alpine` as `patana-postgres` with volume `patana_pgdata` and healthcheck `pg_isready`. For CI, the same image works as a service container.

```yaml
# GitHub Actions example
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: patana
      POSTGRES_PASSWORD: patana_secret
      POSTGRES_DB: patana
    ports: ["5432:5432"]
    options: >- --health-cmd="pg_isready -U patana -d patana" --health-interval=5s
```

## Migration in CI

```bash
# Install
npm ci
npx prisma generate

# Apply pending migrations (prod/staging)
npx prisma migrate deploy

# Seed only if needed (staging)
npm run db:seed  # guard with env check in seed.ts
```

Use `migrate deploy` in CI — never `db push` or `migrate dev` against staging/prod.

Local dev may use `db push` for speed; commit a migration when schema is settled.

## Backup

- **Managed DB**: enable automated daily snapshots + point-in-time recovery (PITR) per provider.
- **Self-hosted / Docker**: `pg_dump` cron:

```bash
pg_dump $DATABASE_URL --format=custom --file=backup-$(date +%F).dump
# restore
pg_restore --clean --if-exists -d $DATABASE_URL backup.dump
```

- Test restores periodically. Keep last 7 daily + 4 weekly.

## Health Checks

| Check | How |
|-------|-----|
| DB reachable | `pg_isready` (compose healthcheck) or `SELECT 1` via Prisma `$queryRaw` |
| API liveness | `GET /health` → `{ status: "ok", db: "up" }` (add when server exists) |
| Migration drift | `npx prisma migrate status` in CI — fail if drift detected |

Add `GET /health` and `GET /ready` when the HTTP server is wired; `ready` should check DB connectivity.
