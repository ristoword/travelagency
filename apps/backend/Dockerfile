# Dockerfile for apps/backend - multi-stage build for monorepo

# ---- builder ----
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl libc6-compat python3 make g++
WORKDIR /app

# Enable corepack and activate pnpm version declared in repository
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy root manifest and lockfile (if present)
COPY package.json pnpm-lock.yaml* ./
# Copy backend package and source
COPY apps/backend/package.json apps/backend/
COPY apps/backend ./apps/backend
# If you use a top-level prisma schema folder
COPY prisma ./prisma

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile --reporter=silent || pnpm install --reporter=silent

# Generate Prisma client and build the backend
RUN pnpm --filter @travel-agency/backend run prisma:generate
RUN pnpm --filter @travel-agency/backend run build

# ---- runtime ----
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# Copy build artifacts and production node_modules from builder
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/prisma ./prisma

ENV NODE_ENV=production
EXPOSE 3000

# At runtime apply prisma push and run seed then start the app
CMD ["sh", "-c", "npx prisma db push && node dist/database/seed-runner.js && node dist/main"]
