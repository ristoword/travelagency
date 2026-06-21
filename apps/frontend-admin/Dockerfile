# Monorepo build — Railway: Dockerfile path = apps/frontend-admin/Dockerfile
# NEXT_PUBLIC_* must be set as Railway Variables (Build + Deploy) before deploying.

FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@9
WORKDIR /app

# Copy workspace manifests + lockfile for deterministic install
COPY package.json pnpm-workspace.yaml ./
COPY apps/frontend-admin/package.json ./apps/frontend-admin/
RUN pnpm install --filter @travel-agency/frontend-admin --prod=false

# Build-time env vars (baked into the JS bundle — must be provided as ARG/ENV)
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ARG NEXT_PUBLIC_DEFAULT_TENANT_SLUG=agenzia-principale
ARG NEXT_PUBLIC_APP_NAME=Travel Agency Admin
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_DEFAULT_TENANT_SLUG=$NEXT_PUBLIC_DEFAULT_TENANT_SLUG
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME

COPY apps/frontend-admin ./apps/frontend-admin
WORKDIR /app/apps/frontend-admin
RUN pnpm build

# ── Runner ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production
# CRITICAL: bind to all interfaces so Railway's load-balancer can reach the container
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Standalone output (includes server.js + traced node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend-admin/.next/standalone ./
# Static assets
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend-admin/.next/static ./apps/frontend-admin/.next/static
# Public folder
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend-admin/public ./apps/frontend-admin/public

USER nextjs
EXPOSE 3000
# PORT=3000 deve essere impostato nelle Railway Variables del servizio frontend.
# Il CMD usa il PORT iniettato da Railway — NON sovrascrivere qui o Railway
# instraderà il traffico sulla porta sbagliata.
ENV PORT=3000
CMD ["node", "apps/frontend-admin/server.js"]
