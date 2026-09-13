# Database — Patana Booking (Modular Monolith)

## Overview

Single Postgres 16, **schema-per-module** via Prisma `multiSchema` (preview feature). Four module schemas + `public`:

| Module | Postgres schema | Tables | Enums |
|--------|----------------|--------|-------|
| `shared` | `shared` | `User` | — (enums are global) |
| `catalog` | `catalog` | `Owner`, `Property`, `Unit` | — |
| `booking` | `booking` | `Availability`, `Booking` | — |
| `checkout` | `checkout` | `Payment` | — |
| — | `public` | (none / migration history) | `UserRole`, `OwnerStatus`, `PropertyType`, `UnitStatus`, `BookingStatus`, `PaymentStatus`, `PaymentMethod` |

Prisma `schema.prisma` lives at `patana-api/prisma/schema.prisma` (canonical). Root `prisma/schema.prisma` is a deprecated pointer — keep in sync or treat `patana-api` as source of truth.

## Prisma Multi-Schema Setup

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["public", "catalog", "booking", "checkout", "shared"]
}

model User {
  // ...
  @@schema("shared")
}
model Owner   { /* ... */ @@schema("catalog") }
model Property{ /* ... */ @@schema("catalog") }
model Unit    { /* ... */ @@schema("catalog") }
model Availability { /* ... */ @@schema("booking") }
model Booking      { /* ... */ @@schema("booking") }
model Payment      { /* ... */ @@schema("checkout") }
```

- `schemas` lists all Postgres schemas Prisma manages. `@@schema("…")` assigns each model to its module schema.
- Cross-schema relations (e.g., `Booking.unitId → Unit`, `Booking.userId → User`, `Payment.bookingId → Booking`) are allowed; Prisma generates cross-schema FKs.
- If `multiSchema` complicates `db push` locally, the comment in `schema.prisma` notes: module split is via `@@schema` and migrations are per-schema; for now we keep a single DB but schema-per-module is ready. For managed setups without the preview, remove `previewFeatures` and `@@schema` lines and keep the single `public` schema — models are still logically owned per module.

## Connection

```env
DATABASE_URL="postgresql://patana:***@localhost:5432/patana?schema=public"
```

`datasource` `schemas` handles per-module schema routing; the `?schema=public` query param is still needed for the `public` schema. Switching DBs = change `DATABASE_URL` and `npx prisma db push` / `migrate` under `patana-api/`.

> Gotcha: if port 5432 is busy, map `5433:5432` in `docker-compose.yml` and set `DATABASE_URL=...@localhost:5433/...`.

## Per-Module Table Ownership

### shared — User

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `Uuid` | `PK` |
| `email` | `String` | `@unique`, `@index` |
| `role` | `UserRole` | `@default(GUEST)` |
| `deletedAt` | `DateTime?` | soft-delete |
| Relations | `owner Owner?`, `bookings Booking[]` | cross-schema |

### catalog — Owner / Property / Unit

Owner: `userId @unique FK → shared.User.id Cascade`, `status OwnerStatus`.
Property: `ownerId FK → Owner.id Cascade`, `@index([ownerId])`, `city`, `country @default("CD")`.
Unit: `propertyId FK → Property.id`, `capacity Int`, `basePrice Decimal(10,2)`, `status UnitStatus`.

### booking — Availability / Booking

Availability: `unitId FK → catalog.Unit.id`, `@db.Date date`, `priceOverride Decimal?`, `isAvailable @default(true)`, `@@unique([unitId,date])`, `@@index([unitId,date])`.
Booking: `userId FK → shared.User.id`, `unitId FK → catalog.Unit.id`, `checkIn/checkOut @db.Date`, `guests Int`, `status BookingStatus`, `currency @default("CDF")`, `totalPrice Decimal?`, `EXCLUDE USING gist (unitId WITH =, daterange(checkIn,checkOut) WITH &&) WHERE status IN ('PENDING','CONFIRMED')`.

### checkout — Payment

Payment: `bookingId FK → booking.Booking.id`, `amount Decimal`, `currency @default("CDF")`, `method PaymentMethod`, `status`, `idempotencyKey String? @unique`, `providerRef String?`.

## Extensions & Constraints

| Object | Type | Detail |
|--------|------|--------|
| `btree_gist` | Extension | `CREATE EXTENSION IF NOT EXISTS btree_gist;` — enables booking EXCLUDE. |
| `User.email` | UNIQUE+INDEX | `email` |
| `Availability(unitId,date)` | UNIQUE+INDEX | `(unitId,date)` |
| `Booking overlap` | EXCLUDE USING gist | `(unitId WITH =, daterange(checkIn,checkOut) WITH &&) WHERE status IN ('PENDING','CONFIRMED')` |
| `Payment.idempotencyKey` | UNIQUE | when provided |

## Indexes

Same as single-schema version — per-module schemas keep the same indexes; GiST index from EXCLUDE lives in `booking` schema.

## Migrations — Per-Schema

| Command (run in `patana-api/`) | Purpose |
|---|---|
| `npx prisma migrate dev --name <msg>` | Generates per-schema migration(s) under `patana-api/prisma/migrations/` |
| `npx prisma migrate deploy` | CI/prod — applies pending |
| `npx prisma db push` | Local prototyping — syncs all schemas directly |
| `npx prisma generate` | After any `schema.prisma` edit |

Rules: never edit a shipped migration; raw SQL (extensions, EXCLUDE, CHECKs) goes in `migration.sql`; commit `schema.prisma` + migration together. If you disable `multiSchema`, migrations collapse to `public`.

## Garage S3 Media

No DB table for media. `shared/media` module talks to **Garage S3** (S3-compatible) bucket `patana-media`:

- `GARAGE_S3_ENDPOINT`, `GARAGE_S3_BUCKET`, `GARAGE_S3_ACCESS_KEY/SECRET`, `CDN_URL` in `patana-api/.env`.
- Flow: `POST /api/media/presign { key }` → `{ uploadUrl, cdnUrl }`; client PUTs to S3, stores `cdnUrl` on Property/Unit image field (or future `Media` model).
- Garage S3+CDN is referenced in `docs/ARCHITECTURE.md` diagram and `patana-api/src/modules/shared/media`.

## Seeding

`patana-api/prisma/seed.ts` (also `prisma/seed.ts` deprecated copy) — 3 users, 2 properties, 4 units, 56 availability rows, 2 bookings, 2 payments. Run after `db push`/`migrate deploy`:

```bash
cd patana-api && npx prisma db push && npm run db:seed
```

## Prisma Studio

```bash
cd patana-api && npx prisma studio
# or root: npx prisma studio (deprecated schema)
```
