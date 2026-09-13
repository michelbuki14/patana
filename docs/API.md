# API Contract — Patana Booking (Modular Monolith)

Base URL: `http://localhost:3001/api` (local) · Auth: `Authorization: Bearer …` unless marked Public.
All amounts are `{ amount: "123.45", currency: "CDF" }` (Decimal as string). Dates are `YYYY-MM-DD` and ISO 8601 for timestamps.

> Routes are **grouped by module** (`catalog/*`, `booking/*`, `checkout/*`, `shared/auth|media`). This matches `patana-api/src/modules/*` controllers. Wire implementation incrementally; Prisma models are source of truth. Cross-module events via `EventBus` (`booking.confirmed`, `payment.succeeded`) are noted below.

## Conventions

- Pagination: `?page=1&limit=20` → `{ data: [...], meta: { page, limit, total } }`
- Errors: `{ error: { code, message, details? } }` with HTTP status.
- Idempotency: `Idempotency-Key: <uuid>` header on `POST /booking/reservations` and `POST /checkout/payments`.
- Soft-delete: `DELETE` sets `deletedAt`; filtered out by default.

### Error Codes

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Bad input, checkOut ≤ checkIn, guests > capacity |
| 401 | `UNAUTHORIZED` | Missing/invalid JWT |
| 403 | `FORBIDDEN` | Role insufficient |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Overlap, unique violation, idempotency replay mismatch |
| 422 | `UNPROCESSABLE` | Availability gap, unit inactive |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL` | Server error |

---

## Shared — Auth & Identity (`shared/auth`, `shared/media`)

### `POST /api/auth/login` — Login (Public)

```http
POST /api/auth/login
{ "email": "bob@patana.cd", "password": "secret" }
```
→ `{ token, user: { id, email, role } }`

### `GET /api/auth/me/:userId` — Current user (Auth)

### `GET /api/users` — List (Auth: ADMIN)
`GET /api/users?page=1&limit=20&role=GUEST` — (future: `shared/users` controller; currently via Prisma User)

### `POST /api/media/presign` — Presigned S3 upload (Auth: OWNER)

```http
POST /api/media/presign
{ "key": "properties/<propertyId>/hero.jpg" }
```
→ `{ uploadUrl: "http://garage:3900/patana-media/...", cdnUrl: "https://cdn.patana.cd/..."}`
Garage S3 bucket `patana-media` behind CDN.

### Legacy alias: `POST /api/users` still available via deprecated root route — prefer `/api/auth`.

---

## Catalog (`catalog` module — `patana-api/src/modules/catalog`)

Owns `Owner`, `Property`, `Unit` (schema `catalog`).

### `POST /api/catalog/properties` — Create (Auth: OWNER VERIFIED)

```json
{ "title":"Patana Hotel","description":"...","propertyType":"HOTEL","address":"Av. ...","city":"Kinshasa","country":"CD","ownerId":"uuid" }
```

### `GET /api/catalog/properties` — List (Public)

`?city=Kinshasa&type=HOTEL&ownerId=uuid&page=1&limit=20`
→ `GET /api/properties` is a legacy alias.

### `GET /api/catalog/properties/:id` — Get one (Public)

`?include=units` includes units summary.

### `PATCH /api/catalog/properties/:id` — Update (Auth: Owner)

### `DELETE /api/catalog/properties/:id` — Soft delete (Auth: Owner/ADMIN)

### `GET /api/catalog/properties/:propertyId/units` — List units (Public)

`?status=ACTIVE&minCapacity=2` → legacy alias `GET /api/properties/:propertyId/units`.

### `GET /api/catalog/units/:id` — Get one (Public)

### `GET /api/catalog/units` — Search units (Public)

`GET /api/catalog/units?city=Kinshasa&guests=2&from=2024-02-01&to=2024-02-10&propertyType=HOTEL`
Catalog filter + availability window join (delegates to booking module for dates).

Legacy aliases: `GET /api/units`, `GET /api/properties/:id/units` still route to catalog.

### `GET /api/catalog/owners` / `GET /api/catalog/owners/:id` — Owners (Auth)

`POST /api/owners` (request profile), `PATCH /api/owners/:id/status` (ADMIN verify) remain as legacy aliases.

---

## Booking (`booking` module — `patana-api/src/modules/booking`)

Owns `Availability`, `Booking` (schema `booking`). Re-uses `isOverlapping`, `canBook`, `calculateTotalPrice` from `booking.service.ts`.

### Availability

Per-day rows: `@@unique([unitId,date])` in `booking` schema.

#### `GET /api/booking/availability/:unitId?from=2024-02-01&to=2024-02-10` — Query window (Public)

```json
{ "unitId":"uuid","from":"2024-02-01","to":"2024-02-10","days":[{"date":"2024-02-01","isAvailable":true,"priceOverride":null,"effectivePrice":"85000"}] }
```
Legacy alias: `GET /api/units/:unitId/availability`.

#### `PUT /api/booking/availability/:unitId` — Upsert (Auth: Owner)

```json
{ "days":[{"date":"2024-02-01","isAvailable":true,"priceOverride":"95000"},{"date":"2024-02-02","isAvailable":false}] }
```
Legacy aliases: `PUT /api/units/:unitId/availability`, `PUT /api/units/:unitId/availability/bulk`.

### Reservations

#### `POST /api/booking/reservations` — Create (Auth) — Idempotent

```http
POST /api/booking/reservations
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
{ "unitId":"uuid","checkIn":"2024-02-10","checkOut":"2024-02-13","guests":2, "userId":"uuid" }
```
Validation: `canBook()` (dates, capacity, availability, overlap). Overlap → `409 CONFLICT`. On success emits `booking.created` on EventBus; price computed via `calculateTotalPrice(priceOverride ?? basePrice)`.

Legacy alias: `POST /api/bookings`.

#### `GET /api/booking/reservations` — List (Auth)

`?status=PENDING&unitId=uuid&userId=uuid` — Guest sees own; ADMIN sees all. Legacy alias `GET /api/bookings`.

#### `GET /api/booking/reservations/:id` — Get one (Auth)

#### `PATCH /api/booking/reservations/:id/status` — Transition (Auth)

`{ "status":"CANCELLED" }` — emits `booking.cancelled` if applicable. Legacy alias `PATCH /api/bookings/:id/status`.

---

## Checkout (`checkout` module — `patana-api/src/modules/checkout`)

Owns `Payment` (schema `checkout`). Handles idempotencyKey and provider orchestration.

### `POST /api/checkout/payments` — Create payment (Auth) — Idempotent

```http
POST /api/checkout/payments
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440001
{ "bookingId":"uuid","amount":"255000","currency":"CDF","method":"CARD" }
```
`idempotencyKey @unique` — duplicate key with same payload returns existing `200`; mismatched payload → `409`. Legacy alias `POST /api/payments`.

### `GET /api/checkout/payments?bookingId=uuid` — List (Auth)

### `GET /api/checkout/payments/:id` — Get one (Auth)

### `POST /api/checkout/payments/:id/confirm` — Confirm (Auth: system/webhook)

```json
{ "status":"SUCCEEDED","providerRef":"ch_xxx" }
```
On `SUCCEEDED`, booking transitions `PENDING→CONFIRMED` transactionally and emits `payment.succeeded` → `booking.confirmed` → `notifications`. Legacy alias `POST /api/payments/:id/confirm`.

---

## Event Bus

In-process `EventEmitter` in `shared/event-bus` (`EventBusService`):

- `booking.created` — emitted on `POST /api/booking/reservations`.
- `booking.confirmed` — emitted when checkout confirms payment and booking moves to CONFIRMED.
- `booking.cancelled` — emitted on cancel.
- `payment.succeeded` / `payment.failed` — emitted on `POST /api/checkout/payments/:id/confirm`.
- `media.uploaded` — (future) on successful S3 upload.

`notifications` subscribes to `booking.confirmed` + `payment.succeeded` to send email/push. For microservice split, replace with outbox + durable queue (no API change).

## Booking Flow Sequence (Module-Aware)

```
Client               patana-api (modules)                 Postgres / Garage
  │                        │                                   │
  ├─ GET /api/catalog/units?city,dates ──► catalog ──► catalog.Unit
  │◀─ 200 [units] ─────────┤                                   │
  ├─ GET /api/booking/availability/:id?from,to ──► booking ──► booking.Availability
  │◀─ 200 {days} ──────────────────────────────────────────────┘
  ├─ POST /api/booking/reservations ──► booking.canBook() ──► booking.Booking (Serializable TX + EXCLUDE)
  │   Idempotency-Key: k1            └─ emit booking.created ──► EventBus ──► notifications
  │◀─ 201 {booking} ───────┤
  ├─ POST /api/checkout/payments ──► checkout ──► checkout.Payment (idempotencyKey @unique)
  │◀─ 201 {payment} ────────┤
  ├─ POST /api/checkout/payments/:id/confirm {SUCCEEDED} ──► checkout ──► Booking CONFIRMED (TX)
  │                         └─ emit payment.succeeded/booking.confirmed ──► notifications
  │◀─ 200 {payment} ────────┤
  ├─ POST /api/media/presign ──► shared/media ──► Garage S3 presigned URL → CDN
```

## Legacy Route Map (deprecated, still routed)

| Legacy path | Canonical module path |
|-------------|-----------------------|
| `POST /api/users`, `GET /api/users` | `POST /api/auth/login`, `GET /api/auth/me/:id` (User is shared) |
| `GET /api/properties` | `GET /api/catalog/properties` |
| `GET /api/units`, `GET /api/units/:id` | `GET /api/catalog/units`, `GET /api/catalog/units/:id` |
| `GET /api/units/:id/availability` | `GET /api/booking/availability/:id` |
| `POST /api/bookings` | `POST /api/booking/reservations` |
| `POST /api/payments`, `GET /api/payments*` | `POST /api/checkout/payments`, `GET /api/checkout/payments*` |
