# ─────────────────────────────────────────────────────────────
# Build stage — compile TypeScript → dist + generate Prisma client
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Root workspace lockfile is required for npm ci across the monorepo
COPY package.json package-lock.json pnpm-workspace.yaml ./
COPY patana-api/package.json ./patana-api/
COPY patana-api/tsconfig.json ./patana-api/
COPY patana-api/src/ ./patana-api/src/
COPY patana-api/prisma/ ./patana-api/prisma/

# Install all workspace dependencies (patana-api deps are hoisted)
RUN npm ci --ignore-scripts

# Compile patana-api TypeScript
RUN npx tsc --project patana-api/tsconfig.json

# Generate the Prisma Client (multi-schema aware)
RUN npx prisma generate

# ─────────────────────────────────────────────────────────────
# Runtime stage — lean image with compiled output only
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Compiled NestJS application
COPY --from=build /app/patana-api/dist/ ./dist/

# Dependencies (includes @nestjs/*, @prisma/client, reflect-metadata, generated client)
COPY --from=build /app/node_modules/ ./node_modules/

# Prisma schema (for optional runtime migrations / db push)
COPY --from=build /app/patana-api/prisma/ ./prisma/

EXPOSE 3001
ENV PORT=3001

# Health check — hits the monitoring endpoint, no business logic
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', r => r.on('error', () => process.exit(1)).on('response', res => res.statusCode === 200 ? process.exit(0) : process.exit(1)))"

# Start the compiled application
CMD ["node", "dist/main.js"]
