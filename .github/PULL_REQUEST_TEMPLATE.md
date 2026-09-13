# Pull Request Template

## Context

<!-- Link issue/ticket and describe the why in 1-2 sentences -->

Fixes: #

## Changes

<!-- Bullet list of what changed -->

-
-

## Testing

<!-- How did you test? Check applicable -->

- [ ] `npx tsc --noEmit` passes
- [ ] `npx prisma generate` (if schema changed)
- [ ] Unit tests added/updated
- [ ] Manual verification (`prisma studio` / seed / API call)
- [ ] No tests needed (explain why)

## DB Changes

<!-- Check if applicable -->

- [ ] No DB changes
- [ ] `schema.prisma` changed — migration included (`prisma/migrations/...`)
- [ ] `prisma db push` used locally — TODO: create migration before merge
- [ ] Seed updated (`prisma/seed.ts`)
- [ ] `btree_gist` / EXCLUDE / CHECK changes noted

## Checklist

- [ ] Branch from `develop`, conventional commits (`feat:`, `fix:`, etc.)
- [ ] No secrets in diff (`.env` not committed)
- [ ] Docs updated (`docs/*` if behavior/schema changed)
- [ ] CI green
