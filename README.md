# Patana Booking — Modular Monolith

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Modular monolith — 7-table ERD, 4 NestJS modules, 2 React apps, single Postgres (schema-per-module), Garage S3 + CDN. Matches `patana_architecture.pdf`.

## Monorepo Tree

```
patana-booking/
  package.json / pnpm-workspace.yaml   # workspaces: ["patana/apps/*","patana/packages/*","patana-api"]
  patana/
    apps/
      customer/   # @patana/customer — guest search & booking (React + TanStack Router/Query/Form, Tailwind+shadcn) — :3000
      owner/      # @patana/owner — owner dashboard (properties, bookings, calendar) — :3001 (Vite) / API is :3001 — owner Vite is :3001 in this scaffold, adjust via VITE port if colliding
    packages/
      ui/         # @patana/ui — Button/Card/Input
      theme/      # @patana/theme — tokens + tailwindPreset
      api-client/ # @patana/api-client — createClient(baseUrl)
      types/      # @patana/types — UserRole etc.
      validation/ # @patana/validation — zod schemas
  patana-api/     # NestJS modular monolith
    src/
      main.ts  app.module.ts
      modules/
        catalog/   (Property/Unit/Owner, search)
        booking/   (Availability + reservations — canBook/overlap)
        checkout/  (payments, idempotencyKey)
        shared/    (auth/User, media Garage S3, notifications, event-bus)
    prisma/
      schema.prisma  # multiSchema: @@schema per model, schemas=["public","catalog","booking","checkout","shared"]
      seed.ts
  prisma/  src/   # deprecated — pointers to patana-api/
  docs/
```

## Quickstart

```bash
# 1. Postgres
docker compose up -d

# 2. Install (npm or pnpm — workspaces)
npm install
# or: pnpm install

# 3. Prisma (canonical is patana-api/)
npx prisma generate
cd patana-api && npx prisma generate && cd ..
npx prisma db push              # or patana-api: cd patana-api && npx prisma db push
cd patana-api && npm run db:seed
# deprecated root seed still works: npm run db:seed

# 4. Run
# API
cd patana-api && npm run dev    # http://localhost:3001/api
# Frontend — two terminals
cd patana/apps/customer && npm run dev   # http://localhost:3000 (Vite)
cd patana/apps/owner && npm run dev      # http://localhost:3001 → if port collides with API, change Vite port in vite.config.ts

# 5. Verify
npx tsc --noEmit
cd patana-api && npx tsc --noEmit
```

Workspace commands: `npm --workspace patana-api run dev`, `npm --workspace @patana/customer run dev`, `npm --workspace @patana/owner run dev` (pnpm: `pnpm --filter @patana/customer dev`).

---

## Docs

| Doc | Description |
|-----|-------------|
| [Architecture](docs/ARCHITECTURE.md) | ERD, bounded contexts, data flow, invariants, overlap prevention, scaling, stack |
| [API Contract](docs/API.md) | REST routes by resource, auth, examples, errors, idempotency |
| [Database](docs/DATABASE.md) | Prisma schema reference, indexes, constraints, migrations, seeding |
| [Decisions (ADRs)](docs/DECISIONS.md) | 5 ADRs — enums, exclusion, per-day availability, UUIDs, currency/idempotency |
| [Onboarding](docs/ONBOARDING.md) | New dev in 10 min — prerequisites, setup, gotchas, commands |
| [Deployment](docs/DEPLOYMENT.md) | Environments, env vars, Docker Postgres, CI migrations, backups |
| [Contributing](docs/CONTRIBUTING.md) | Branches, commits, PR checklist, style, testing, schema changes |

## Stack
- Node.js + TypeScript
- Prisma 5 + PostgreSQL 16
- Docker Compose for local Postgres

## ERD (7 tables)
```
User 1──0..1 Owner 1──* Property 1──* Unit 1──* Availability
  │                                    └──* Booking *──1 User
  │                                         └──* Payment
```

## Fixes applied
- Enums instead of free-text status/type columns (7 enums)
- UUID PKs (`uuid()`), `createdAt`/`updatedAt` on every table, `deletedAt` soft-delete prep on User/Property/Unit/Booking
- Unique: `User.email`, `Owner.userId`, `Availability(unitId,date)`
- Indexes on all FKs + `(unitId,date)` composite
- `Availability.priceOverride Decimal?` nullable, `isAvailable Boolean @default(true)`
- `Booking.currency String @default("CDF")`, `Payment.currency` + `idempotencyKey String? @unique`
- Overlap prevention: application guard + Postgres `EXCLUDE USING gist` (btree_gist) migration with fallback comment
- CHECK-like comments for `checkOut > checkIn`, `guests <= capacity`, `amount >= 0`
- Pure booking service (`src/booking.service.ts`) with `isOverlapping`, `canBook`, `calculateTotalPrice`, transactional `reserve` pattern

## Quick start
```bash
# 1. Start Postgres
docker compose up -d
# 2. Install & generate
npm install
npx prisma generate
# 3. Push schema & seed
npx prisma db push
npm run db:seed
# 4. Verify
npx tsc --noEmit
npm run build
```

If Docker unavailable: `npx prisma db push --accept-data-loss` will still validate schema; seed requires a reachable `DATABASE_URL`.

Full onboarding: [docs/ONBOARDING.md](docs/ONBOARDING.md)

## Scripts

| script | purpose |
|---|---|
| `npm run generate` | prisma generate |
| `npm run db:push` | push schema without migration |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | seed demo data |
| `npm run build` | tsc -> dist |
| `npx prisma studio` | visual DB |

## Seed data
- 3 users (alice owner, bob guest, carol guest)
- 2 properties (Patana Hotel — 3 units, Patana Apartment — 1 unit)
- 14 days availability per unit (56 rows)
- 2 bookings (CONFIRMED+paid, PENDING)
- 2 payments (SUCCEEDED, PENDING with idempotencyKey)

## Overlap prevention
See `prisma/migrations/20240101000000_init/migration.sql` — enables `btree_gist` and adds `EXCLUDE USING gist (unitId WITH =, daterange(checkIn, checkOut) WITH &&) WHERE (status IN ('PENDING','CONFIRMED'))` when available; otherwise `src/booking.service.ts:canBook` enforces it in app.

## Currency
All monetary columns are `Decimal` with explicit `currency` (default `CDF`) — no implicit currency assumptions.

## Idempotency
`Payment.idempotencyKey` is `@unique` when provided; clients should send `Idempotency-Key: <uuid>` on create-payment.

## License MIT
