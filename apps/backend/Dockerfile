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

# RUN_SEED=true forces demo data seeding even if tenant already exists.
# Set to "false" (or leave unset) in production with real data.
ENV RUN_SEED=true

# Startup:
# 1. prisma migrate deploy  — applies pending migrations safely (no data loss, idempotent)
# 2. seed-runner            — seeds/updates demo data when RUN_SEED=true
# 3. node dist/main         — starts NestJS
CMD ["sh", "-c", "pnpm exec prisma db push && node dist/database/seed-runner.js && node dist/main"]
