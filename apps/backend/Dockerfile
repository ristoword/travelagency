# Robust Dockerfile for apps/backend - copies full repo to ensure monorepo files (pnpm-workspace, turbo, etc.) are available

# ---- builder ----
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl libc6-compat python3 make g++
WORKDIR /app

# Enable corepack and activate pnpm version declared in repository
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy entire repository to ensure workspace manifests are present
COPY . .

# Install dependencies (use frozen lockfile if present, fallback to normal install)
RUN pnpm install --frozen-lockfile --reporter=silent || pnpm install --reporter=silent

# Generate Prisma client for backend (if prisma schema present)
RUN pnpm --filter @travel-agency/backend run prisma:generate || true

# Build the backend package
RUN pnpm --filter @travel-agency/backend run build

# ---- runtime ----
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# Copy only the necessary artifacts from builder
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
# copy prisma client if present
COPY --from=builder /app/apps/backend/prisma ./prisma

ENV NODE_ENV=production
EXPOSE 3000

# At runtime, optionally apply prisma push and seed if RUN_SEED=true, then start the app
CMD ["sh", "-c", "if [ \"${RUN_SEED:-false}\" = \"true\" ]; then npx prisma db push && node dist/database/seed-runner.js; fi; node dist/main"]
