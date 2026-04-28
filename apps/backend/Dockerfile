FROM node:20-alpine
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

# Generate Prisma client and build TypeScript
RUN pnpm prisma generate && pnpm build

# Railway injects PORT automatically
EXPOSE 3000

# Run migrations then start — using absolute paths to avoid workdir issues
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main"]
