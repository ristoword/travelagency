FROM node:20-alpine

# OpenSSL + libs required by Prisma on Alpine
RUN apk add --no-cache openssl libc6-compat

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace manifests for install
COPY package.json pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/

# Install backend dependencies (no lockfile — lockfile is gitignored)
RUN pnpm install --filter @travel-agency/backend --no-frozen-lockfile --ignore-scripts

# Copy backend source + prisma schema
COPY apps/backend/ ./apps/backend/

# Switch to backend directory so pnpm exec resolves binaries locally (not recursively)
WORKDIR /app/apps/backend

# Remove any stale generated Prisma client, then regenerate from schema
RUN rm -rf node_modules/.prisma node_modules/@prisma/client/runtime 2>/dev/null || true
RUN npx --yes prisma generate --schema=./prisma/schema.prisma

# Compile TypeScript
RUN pnpm build

EXPOSE 3000

# RUN_SEED=true forces demo data seeding even if tenant already exists.
ENV RUN_SEED=true

# Startup:
# 1. prisma db push   — syncs schema to DB (safe, idempotent)
# 2. seed-runner      — seeds/updates demo data when RUN_SEED=true
# 3. node dist/main   — starts NestJS
CMD ["sh", "-c", "npx prisma db push --schema=./prisma/schema.prisma && node dist/database/seed-runner.js && node dist/main"]
