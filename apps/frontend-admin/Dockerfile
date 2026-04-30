FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml ./
COPY apps/frontend-admin/package.json ./apps/frontend-admin/

# Install dependencies
RUN pnpm install --filter @travel-agency/frontend-admin

# Copy frontend-admin source
COPY apps/frontend-admin ./apps/frontend-admin

WORKDIR /app/apps/frontend-admin

# Build Next.js
RUN pnpm build

# Railway injects PORT automatically
EXPOSE 3000

# Use $PORT so Railway's healthcheck and routing work correctly
CMD ["sh", "-c", "pnpm next start -p ${PORT:-3000}"]
