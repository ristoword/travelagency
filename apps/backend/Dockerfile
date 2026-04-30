FROM node:20-alpine

# OpenSSL required by Prisma on Alpine
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

# Generate Prisma client and build TypeScript
RUN pnpm prisma generate && pnpm build \
    && if [ ! -f dist/main.js ]; then echo "ERROR: dist/main.js not found after build. Contents of dist/:"; ls -la dist/ 2>/dev/null || echo "(dist/ directory does not exist)"; exit 1; fi

# Railway injects PORT automatically
EXPOSE 3000

# Push schema to DB (creates all tables) then start the server
# prisma db push is used because no migration files exist yet
CMD ["sh", "-c", "node_modules/.bin/prisma db push --accept-data-loss && node dist/main"]
