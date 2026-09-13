# Onboarding — Patana Booking (10 min, Modular Monolith)

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 20+ | `node -v` |
| npm / pnpm | 10+ / 9+ | `npm -v` / `pnpm -v` |
| Docker + Compose | recent | `docker -v && docker compose version` |
| psql (optional) | 16 | `psql --version` |

## Repo Layout

```
patana-booking/
  package.json          # workspaces: ["patana/apps/*","patana/packages/*","patana-api"]
  pnpm-workspace.yaml
  patana/
    apps/customer/      # @patana/customer — guest app (Vite :3000)
    apps/owner/         # @patana/owner — owner app (Vite :3001)
    packages/ui|theme|api-client|types|validation/
  patana-api/           # NestJS modular monolith — the API
    src/modules/catalog|booking|checkout|shared/
    prisma/schema.prisma  (multiSchema)
  prisma/  src/         # deprecated — pointers to patana-api/
  docs/
```

## Steps

### 1. Clone

```bash
git clone <repo-url> patana-booking
cd patana-booking
```

### 2. Env

Root + API env (API is canonical):

```bash
cp patana-api/.env.example patana-api/.env
# edit DATABASE_URL, PORT, JWT_SECRET, GARAGE_*
# Root .env is optional (deprecated) — API reads patana-api/.env
```

```env
DATABASE_URL="postgresql://patana:patana_secret@localhost:5432/patana?schema=public"
PORT=3001
JWT_SECRET=change-me
GARAGE_S3_ENDPOINT=http://localhost:3900
GARAGE_S3_BUCKET=patana-media
CDN_URL=https://cdn.patana.cd
```

Frontend env:

```bash
cp patana/apps/customer/.env.example patana/apps/customer/.env
cp patana/apps/owner/.env.example patana/apps/owner/.env
# VITE_API_URL=http://localhost:3001
```

### 3. Start Postgres

```bash
docker compose up -d
docker compose ps
```

> If 5432 is busy, change `docker-compose.yml` ports to `"5433:5432"` and set `DATABASE_URL` to `...@localhost:5433/...`.

### 4. Install (workspaces)

npm (workspaces field) or pnpm:

```bash
# npm
npm install
# or pnpm
pnpm install

# Generate Prisma clients (root deprecated + API)
npx prisma generate
cd patana-api && npx prisma generate && cd ..
```

### 5. Push Schema & Seed

```bash
# canonical
cd patana-api
npx prisma db push
npm run db:seed
cd ..

# deprecated root (optional, keeps old path working)
npx prisma db push
npm run db:seed
```

### 6. Run

```bash
# API (NestJS)
cd patana-api && npm run dev
# or from root: npm --workspace patana-api run dev

# Frontend — two terminals
cd patana/apps/customer && npm run dev   # http://localhost:3000
cd patana/apps/owner && npm run dev      # http://localhost:3001
```

Workspace commands:

```bash
npm run lint           # tsc --noEmit (root)
npm --workspace patana-api run lint
npm --workspace @patana/customer run dev
npm --workspace @patana/owner run dev
# pnpm equivalents: pnpm --filter @patana/customer dev
```

### 7. Verify

```bash
npx tsc --noEmit                 # root
cd patana-api && npx tsc --noEmit
npm run build                    # root tsc
cd patana-api && npm run build
```

### 8. Studio

```bash
cd patana-api && npx prisma studio   # http://localhost:5555
```

## Common Gotchas

| Symptom | Fix |
|---------|-----|
| `port 5432 already in use` | Map `5433:5432` and update `DATABASE_URL`. |
| `Can't reach database` | Check `docker compose ps` vs `DATABASE_URL` host/port. |
| `btree_gist` errors | Needs superuser; local Docker has it, managed DBs may not — app guard is fallback. |
| `prisma generate` stale | Re-run after every `schema.prisma` edit (both roots). |
| `multiSchema` errors on push | Remove `previewFeatures`/`@@schema` temporarily to test single-schema fallback — see DATABASE.md. |
| Vite `workspace:*` not found | Run `npm install` or `pnpm install` at root to link workspaces. |
| `VITE_API_URL` not picked up | Ensure `.env` in the app folder, restart Vite. |

## Next

- `docs/ARCHITECTURE.md` — modular monolith diagram, module trees, ERD ownership, event flow.
- `docs/DATABASE.md` — schema-per-module, Garage S3.
- `docs/API.md` — routes grouped by module.
