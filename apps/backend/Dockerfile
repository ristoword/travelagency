FROM node:20-alpine
RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/

# Install all dependencies
RUN pnpm install --filter @travel-agency/backend --frozen-lockfile

# Copy backend source
COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend

# Generate Prisma client and build TypeScript
RUN pnpm prisma generate && pnpm build

# Railway injects PORT automatically — EXPOSE is documentation only
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
