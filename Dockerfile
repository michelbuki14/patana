# ─────────────────────────────────────────────────────────────
# Build stage — compile TypeScript → dist + generate Prisma client
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY prisma/ ./prisma/
COPY src/ ./src/

RUN npm ci --ignore-scripts

# Generate Prisma client (engines required)
RUN npx prisma generate

# Compile TypeScript
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Runtime stage — lean image with compiled output only
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

COPY package.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/dist/ ./dist/
COPY --from=build /app/node_modules/.prisma/ ./node_modules/.prisma/
COPY prisma/ ./prisma/

ENV NODE_ENV=production
EXPOSE 3001
ENV PORT=3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', r => r.on('error', () => process.exit(1)).on('response', res => res.statusCode === 200 ? process.exit(0) : process.exit(1)))"

CMD ["node", "dist/main.js"]
