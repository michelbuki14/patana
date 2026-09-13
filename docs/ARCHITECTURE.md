# Architecture — Patana Booking (Modular Monolith)

## Overview

Patana Booking is a **NestJS modular monolith** with a **2-app React monorepo** frontend, a **single Postgres** (schema-per-module via Prisma `multiSchema`), **Garage S3 + CDN** for media, and an **in-process EventBus** (EventEmitter) for cross-module events. One deployable (`patana-api`), four bounded modules.

> This document is the authoritative architecture and matches `patana_architecture.pdf` verbatim structure where spec says: `apps/customer`, `apps/owner`, `packages/ui|theme|api-client|types|validation`, `patana-api/src/modules/catalog|booking|checkout|shared`, Garage S3+CDN.

## System Diagram

```
                    ┌─────────────────────────────────────────┐
                    │         patana/  (frontend monorepo)    │
                    │  apps/customer  ──►  apps/owner         │
                    │   React 18 + Vite + TanStack Router     │
                    │   TanStack Query + Form + Tailwind/shadcn│
                    │         │                 │              │
                    │         └───────┬─────────┘              │
                    │                 ▼                        │
                    │   packages/ui  theme  api-client types validation │
                    │   (workspace:* deps — shared)           │
                    └─────────────────┬───────────────────────┘
                                      │  typed fetch (api-client)
                                      ▼
                    ┌─────────────────────────────────────────┐
                    │        patana-api  (NestJS modular monolith) │
                    │  src/app.module.ts  imports:            │
                    │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
                    │   │ catalog  │ │ booking  │ │ checkout │ │  shared  │
                    │   │ owners   │ │ avail.   │ │ payments │ │ auth (User)│
                    │   │ properties│ │ reservations│ │ txn   │ │ media (S3)│
                    │   │ units    │ │ canBook  │ │ idempotency│ │ notify │
                    │   │ search   │ │ overlap  │ │ provider │ │ event-bus│
                    │   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
                    │        │            │            │            │
                    │        └────────────┴──── event-bus ──────────┘
                    │          booking.confirmed / payment.succeeded etc.
                    └─────────────────┬───────────────────────┘
                                      │ Prisma (multiSchema)
                                      ▼
                    ┌─────────────────────────────────────────┐
                    │  Postgres 16  (single DB, schema-per-module)│
                    │   shared   → User                       │
                    │   catalog  → Owner, Property, Unit      │
                    │   booking  → Availability, Booking      │
                    │   checkout → Payment                    │
                    │   + btree_gist EXCLUDE on booking       │
                    └─────────────────┬───────────────────────┘
                                      │ S3 API
                                      ▼
                    ┌─────────────────────────────────────────┐
                    │   Garage S3  (patana-media bucket) + CDN │
                    │   presigned upload → CDN URL            │
                    └─────────────────────────────────────────┘
```

## Frontend Monorepo Tree

```
patana/
  apps/
    customer/          # @patana/customer — guest search/booking (React TS, TanStack Router/Query/Form, Tailwind+shadcn)
      package.json
      vite.config.ts
      tailwind.config.ts
      src/
        main.tsx
        App.tsx
        routes/  home.tsx  search.tsx  booking.tsx
      .env.example
    owner/             # @patana/owner — owner dashboard (properties, bookings, calendar)
      package.json
      vite.config.ts
      tailwind.config.ts
      src/
        main.tsx
        App.tsx
        routes/  dashboard.tsx  properties.tsx  bookings.tsx  calendar.tsx
      .env.example
  packages/
    ui/                # @patana/ui — Button/Card/Input stubs (shadcn base)
      package.json
      src/index.ts
    theme/             # @patana/theme — tokens (colors, radius) + tailwindPreset
      package.json
      src/tokens.ts  src/index.ts
    api-client/        # @patana/api-client — typed fetch wrapper createClient(baseUrl)
      package.json
      src/client.ts
    types/             # @patana/types — shared TS types (UserRole etc., Prisma re-export)
      package.json
      src/index.ts
    validation/        # @patana/validation — zod schemas (booking create, property create)
      package.json
      src/schemas.ts
```

Workspace deps: `patana/apps/*` and `patana/packages/*` use `workspace:*`; root `pnpm-workspace.yaml` / `package.json workspaces` declares `["patana/apps/*","patana/packages/*","patana-api"]`.

## Backend Module Tree

```
patana-api/
  package.json         # NestJS deps, scripts build/start/dev
  nest-cli.json
  tsconfig.json
  .env.example
  prisma/
    schema.prisma      # multiSchema: @@schema("catalog"|"booking"|"checkout"|"shared") per model, previewFeatures=["multiSchema"], schemas=["public","catalog","booking","checkout","shared"]
    seed.ts
  src/
    main.ts            # NestFactory.create(AppModule) + setGlobalPrefix('api')
    app.module.ts      # imports CatalogModule, BookingModule, CheckoutModule, SharedModule
    modules/
      catalog/         # Property/Unit/Owner CRUD, search
        catalog.module.ts
        catalog.controller.ts   # routes: GET /api/catalog/properties, /catalog/units, /catalog/owners ...
        catalog.service.ts
        dto/  create-property.dto.ts
      booking/         # Availability + Reservations (re-uses isOverlapping/canBook/calculateTotalPrice from booking.service.ts)
        booking.module.ts
        booking.controller.ts  # routes: GET/POST /api/booking/reservations, GET/PUT /api/booking/availability/:unitId
        booking.service.ts     # pure helpers + Nest wrapper
        dto/  create-booking.dto.ts
      checkout/        # Payments/transactions, idempotencyKey handling
        checkout.module.ts
        checkout.controller.ts # routes: POST/GET /api/checkout/payments, POST /api/checkout/payments/:id/confirm
        checkout.service.ts
        dto/  create-payment.dto.ts
      shared/          # cross-cutting
        shared.module.ts  # @Global, exports EventBus/Auth/Media
        auth/  auth.service.ts  auth.controller.ts  (User identity, JWT stub)
        media/ media.service.ts media.controller.ts (Garage S3 presign, CDN URL)
        notifications/ notifications.service.ts (subscribes to booking.confirmed etc.)
        event-bus/ event-bus.service.ts (EventEmitter — emit booking.confirmed, payment.succeeded etc.)
```

## ERD — Module Ownership Table

| Schema | Model | Owned by | Notes |
|--------|-------|----------|-------|
| `shared` | `User` | **shared/auth** | identity, roles, `@@unique([email])` |
| `catalog` | `Owner` | **catalog** | 1:1 User, `VERIFIED` gate |
| `catalog` | `Property` | **catalog** | `ownerId → Owner`, `city` for search |
| `catalog` | `Unit` | **catalog** | `propertyId → Property`, `capacity`, `basePrice`, `status` |
| `booking` | `Availability` | **booking** | per-day `(unitId,date)` unique, priceOverride |
| `booking` | `Booking` | **booking** | `[checkIn,checkOut)` range, overlap EXCLUDE, `currency` |
| `checkout` | `Payment` | **checkout** | `bookingId → Booking`, `idempotencyKey @unique`, `currency` |

Cross-module FKs (e.g., `Booking.userId → shared.User`, `Booking.unitId → catalog.Unit`, `Payment.bookingId → booking.Booking`) are enforced at the DB level; Prisma `multiSchema` keeps them as cross-schema relations. Enums (`UserRole`, `OwnerStatus`, `PropertyType`, `UnitStatus`, `BookingStatus`, `PaymentStatus`, `PaymentMethod`) are global (no `@@schema`).

## Data Flow via Events

```
Search ──► Availability Check ──► Booking ──► Payment ──► Confirmation
  │              │                  │            │             │
  │ catalog/search│ booking/isAvailable│ booking/canBook│ checkout     │ notifications
  │               │ price calc       │ Serializable TX│ idempotent   │ via EventBus
  │               │                  │ emit:        │ emit:        │ booking.confirmed
  │               │                  │ booking.created│ payment.succeeded│ → email/push
```

- **Catalog** exposes search (filter `Property.city`, `Unit.capacity`, `Unit.status=ACTIVE`).
- **Booking** validates dates/capacity/availability/overlap via `canBook()` + `Serializable` TX + DB `EXCLUDE USING gist (unitId WITH =, daterange(checkIn,checkOut) WITH &&) WHERE status IN ('PENDING','CONFIRMED')`.
- **Checkout** creates `Payment` with `Idempotency-Key`; on `confirm SUCCEEDED` emits `payment.succeeded` and booking transitions `PENDING→CONFIRMED` (transactional).
- **Shared EventBus** (`EventEmitter`) fans out `booking.confirmed` → `notifications` and `media` side effects; ready to swap to outbox+queue if split to services.

## Invariants (unchanged)

| Rule | Enforcement |
|------|-------------|
| `checkOut > checkIn`, ≥1 night, ≤365 | `canBook()` |
| `guests > 0 && <= capacity` | `canBook()` |
| `Unit.status == ACTIVE` | `canBook()` |
| All dates in `[checkIn,checkOut)` have `isAvailable=true` | `canBook()` availability window |
| No overlap on same `unitId` for `PENDING`/`CONFIRMED` | `canBook()` + DB EXCLUDE |
| `amount >=0`, `currency` explicit `CDF` | schema + app check |
| `idempotencyKey @unique` | checkout module |

## Deployment

Single deployable `patana-api` (Docker or Node). Frontend apps build to static and deploy to CDN/Vercel separately. Postgres single instance; Garage S3 bucket `patana-media` behind CDN. `patana-api` reads `DATABASE_URL` with `schemas` param; migrations are per-schema when using `prisma migrate`.

## Backward Compatibility

Root `prisma/schema.prisma` and `src/` are preserved as deprecated pointers to `patana-api/` (single-schema view). New code should use `patana-api/`.

