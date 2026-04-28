FROM node:20-alpine AS base
RUN npm install -g pnpm@9

# ── Builder stage ─────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --filter @travel-agency/backend

COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend
RUN pnpm prisma generate
RUN pnpm build

# ── Production stage ──────────────────────────────────────
FROM node:20-alpine AS production
RUN npm install -g pnpm@9

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/

RUN pnpm install --filter @travel-agency/backend --prod

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY apps/backend/prisma ./apps/backend/prisma

WORKDIR /app/apps/backend

# Railway sets PORT automatically — expose a default for documentation only
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
