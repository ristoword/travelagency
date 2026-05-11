FROM node:20-alpine

# OpenSSL + libs required by Prisma on Alpine
RUN apk add --no-cache openssl libc6-compat

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace manifests + lockfile for deterministic install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/

# Install all dependencies
RUN pnpm install --filter @travel-agency/backend --frozen-lockfile

# Copy backend source + prisma schema
COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend

# Generate Prisma client and compile TypeScript
RUN pnpm exec prisma generate && pnpm build

EXPOSE 3000

# Force seed on every startup — seed is fully idempotent (uses upsert) so safe to run multiple times
ENV RUN_SEED=true

# Startup:
# 1. prisma db push  — creates/syncs all tables from schema (safe on empty DB)
# 2. seed-runner     — always seeds/updates demo data (RUN_SEED=true overrides skip logic)
# 3. node dist/main  — starts NestJS
CMD ["sh", "-c", "pnpm exec prisma db push --accept-data-loss && node dist/database/seed-runner.js && node dist/main"]
