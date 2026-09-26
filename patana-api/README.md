# Patana API

NestJS modular monolith — one deployable unit behind the customer/owner frontends.

## Modules

| Module | Route prefix | Responsibility |
|---|---|---|
| Catalog | `/api/catalog` | Owners, properties, units, listing search |
| Booking | `/api/booking` | Availability calendar, reservation lifecycle |
| Checkout | `/api/checkout` | Payment orchestration, transaction records |
| Shared | `/api/auth`, `/api/media`, `/api/health` | Auth, Garage S3 presign, event bus, notifications |

Modules communicate via `EventBusService` (`booking.confirmed`, `payment.succeeded`, …) —
no direct cross-module calls.

## Database

PostgreSQL, one schema per module (`catalog`, `booking`, `checkout`) plus `public`
for identity. Prisma 5 with `multiSchema` preview.

```bash
npm install
npx prisma generate
npx prisma migrate dev   # requires DATABASE_URL
npm run db:seed
npm run dev              # http://localhost:3001/api
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | ts-node dev server |
| `npm run build` / `npm start` | compile + run compiled output |
| `npm run lint` | `tsc --noEmit` |
| `npm test` | Jest unit tests (mocked Prisma — no DB needed) |
| `npm run db:push` / `db:migrate` / `db:seed` / `db:studio` | Prisma workflows |

## Environment

Copy `.env.example` to `.env`:

- `DATABASE_URL` — PostgreSQL connection string
- `PORT` — default 3001
- `GARAGE_S3_ENDPOINT` / `GARAGE_S3_BUCKET` — media storage
- `CDN_URL` — media delivery base URL
