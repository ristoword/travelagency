FROM node:20-alpine

# OpenSSL + libs required by Prisma on Alpine
RUN apk add --no-cache openssl libc6-compat

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/

# Install all dependencies
RUN pnpm install --filter @travel-agency/backend

# Copy backend source
COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend

# Generate Prisma client and build TypeScript (includes seed-runner.ts)
RUN pnpm prisma generate && pnpm build

# Railway injects PORT automatically
EXPOSE 3000

# Startup sequence:
# 1. prisma db push  — creates/updates all tables from schema.prisma
# 2. seed-runner     — seeds DB if empty (skips if data exists, forced if RUN_SEED=true)
# 3. node dist/main  — starts the NestJS API
CMD ["sh", "-c", "node_modules/.bin/prisma db push --accept-data-loss && node dist/database/seed-runner.js && node dist/main"]
