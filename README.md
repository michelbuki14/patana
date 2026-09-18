# Patana Backend — Foundation

NestJS backend for the Patana platform. Modular monolith with health monitoring and Prisma-based data access.

## Stack

- [NestJS 10](https://nestjs.com/) — application framework
- [Prisma 5](https://www.prisma.io/) — type-safe data access (PostgreSQL)
- [TypeScript 5](https://www.typescriptlang.org/) — strict mode, ES2022 target

## Structure

```
src/
├── config/       # Environment configuration (dotenv, validation)
├── controllers/  # HTTP controllers (thin — delegate to services)
├── middleware/   # Custom middleware (none yet)
├── models/       # Domain models / DTOs (shared with Prisma)
├── routes/       # Route registration (NestJS modules import controllers)
├── services/     # Business logic (currently: health only)
├── utils/        # Shared utilities
└── app.ts        # Application bootstrap
tests/            # Unit tests (Jest + ts-jest)
prisma/           # Prisma schema + seed + migrations
```

## Getting started

```bash
# Install dependencies
pnpm install

# Generate Prisma client (requires DATABASE_URL in .env)
pnpm run generate

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Lint
pnpm run lint

# Run tests
pnpm run test
```

## Environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` — PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/patana`)

Optional variables:
- `PORT` — server port (default: 3001)

## Health check

```bash
curl http://localhost:3001/health
# {"status":"ok","timestamp":"2026-09-17T...","version":"1.0.0"}
```

## Database

```bash
# Push schema to database (development)
pnpm run db:push

# Run migrations
pnpm run db:migrate

# Seed database
pnpm run db:seed

# Open Prisma Studio
pnpm run db:studio
```

## Docker

```bash
# Build image
docker build -t patana-backend .

# Run container
docker run -p 3001:3001 -e DATABASE_URL=postgresql://... patana-backend
```

The image includes a `HEALTHCHECK` that hits `/health`.

## Development

This repository is a foundation only. No business logic has been implemented yet. See the PR that introduced this structure for the initial commit.

## License

MIT
