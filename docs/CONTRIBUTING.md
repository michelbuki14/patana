# Contributing — Patana Booking

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production. Protected, requires PR + CI green. |
| `develop` | Integration. Feature branches merge here first. |
| `feature/<slug>` | New work. Branch from `develop`. |
| `fix/<slug>` | Bugfix. Branch from `develop` (or `main` for hotfix). |
| `chore/<slug>` | Tooling/docs. |

Flow: `feature/* → develop → main`. Keep branches short-lived; rebase on `develop` before opening PR.

## Commit Convention

Conventional Commits. Format: `type(scope): subject`

| Type | When |
|------|------|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Tooling, deps, config |
| `docs` | Docs only |
| `refactor` | No behavior change |
| `test` | Tests |
| `perf` | Performance |

Examples:
```
feat(booking): add Serializable reserve transaction
fix(availability): correct date range upper bound
chore(prisma): regenerate client after schema change
```

## PR Checklist

- [ ] Branch from `develop`, descriptive name
- [ ] Conventional commit messages
- [ ] `npx tsc --noEmit` passes
- [ ] `npx prisma generate` run if `schema.prisma` changed
- [ ] Migration included if schema changed (`prisma migrate dev --name <msg>` or `db:push` noted)
- [ ] Seed updated if new required data
- [ ] Tests added/updated (or reason noted)
- [ ] No secrets in diff (`.env` not committed)
- [ ] PR template filled (`.github/PULL_REQUEST_TEMPLATE.md`)

## Code Style

- TypeScript strict. `npx tsc --noEmit` must pass before push.
- After any `schema.prisma` change: `npx prisma generate` (or `npm run generate`).
- Pre-commit: `npm run lint` (alias for `tsc --noEmit`) + `npm run build`.
- Prefer pure functions (see `src/booking.service.ts`) — easy to test without DB.
- No `any` without justification; prefer explicit types.

## Testing Expectation

| Level | What | Command |
|-------|------|---------|
| Type check | `tsc --noEmit` | `npm run lint` |
| Unit | Pure functions (`canBook`, `calculateTotalPrice`, `isOverlapping`) | `npm test` (when harness added) |
| Integration | Prisma + Postgres (seed, booking flow) | local Docker + `npm run db:seed` |
| Manual | `prisma studio` visual check | `npx prisma studio` |

New service logic must have unit tests. DB-touching code should have at least a happy-path integration note in the PR.

## How to Add a New Table / Field

```
1. Edit prisma/schema.prisma
   - Add model or field
   - Add @@index / @@unique / enums as needed
   - Follow existing style: UUID PK, createdAt/updatedAt, soft-delete if needed

2. Generate client
   npm run generate

3. Create migration
   # preferred (produces migration file)
   npx prisma migrate dev --name add_<table_or_field>
   # or quick local push without history
   npx prisma db push

4. Seed (if required data)
   Edit prisma/seed.ts → npm run db:seed

5. Service layer
   Add/update src/<domain>.service.ts with validation + tests

6. Verify
   npx tsc --noEmit && npm run build
   npx prisma studio  # visual check
```

Notes:
- For constraints needing Postgres features (e.g., `EXCLUDE`, `CHECK`, extensions), add raw SQL in `prisma/migrations/<name>/migration.sql`.
- Never edit a shipped migration — create a new one.
- Document new invariants in `docs/ARCHITECTURE.md` and `docs/DATABASE.md`.
