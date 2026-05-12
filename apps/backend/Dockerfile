FROM node:20-alpine

# OpenSSL + libs required by Prisma on Alpine
RUN apk add --no-cache openssl libc6-compat

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace manifests for install
COPY package.json pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/

# Install all dependencies (no frozen lockfile — lockfile is gitignored)
RUN pnpm install --filter @travel-agency/backend --no-frozen-lockfile --ignore-scripts

# Copy backend source + prisma schema
COPY . .

# Generate Prisma client and compile TypeScript
RUN pnpm exec prisma generate && pnpm build

EXPOSE 3000

# RUN_SEED=true forces demo data seeding even if tenant already exists.
ENV RUN_SEED=true

# Startup:
# 1. prisma db push   — syncs schema to DB (safe, idempotent)
# 2. seed-runner      — seeds/updates demo data when RUN_SEED=true
# 3. node dist/main   — starts NestJS
CMD ["sh", "-c", "pnpm exec prisma db push && node dist/database/seed-runner.js && node dist/main"]
