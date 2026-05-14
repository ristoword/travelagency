FROM node:20-alpine

# OpenSSL + libs required by Prisma on Alpine
RUN apk add --no-cache openssl libc6-compat

# Treat backend as a fully standalone app (no pnpm workspace, no hoisting)
WORKDIR /app

# Copy backend config files first (for install layer caching)
COPY apps/backend/package.json        ./package.json
COPY apps/backend/tsconfig.json       ./tsconfig.json
COPY apps/backend/tsconfig.build.json ./tsconfig.build.json
COPY apps/backend/nest-cli.json       ./nest-cli.json

# Install all deps with npm (no lockfile needed, no workspace)
RUN npm install --ignore-scripts

# Copy prisma schema and generate client BEFORE copying all source
# This ensures the generated Prisma types are available for tsc
COPY apps/backend/prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY apps/backend/prisma ./apps/backend/prisma

# Generate Prisma client and build TypeScript
RUN pnpm prisma generate && pnpm build \
    && if [ ! -f dist/main.js ]; then echo "ERROR: dist/main.js not found after build. Contents of dist/:"; ls -la dist/ 2>/dev/null || echo "(dist/ directory does not exist)"; exit 1; fi

EXPOSE 3000

# RUN_SEED=true forces demo data seeding even if tenant already exists.
ENV RUN_SEED=true

# Startup:
# 1. prisma db push   — syncs schema to DB (safe, idempotent)
# 2. seed-runner      — seeds/updates demo data when RUN_SEED=true
# 3. node dist/main   — starts NestJS
CMD ["sh", "-c", "npx prisma db push && node dist/database/seed-runner.js && node dist/main"]
