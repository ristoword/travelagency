# Railway: Root Directory del servizio = apps/backend (Settings → Source)
# Build context = questa cartella → path relativi, NON apps/backend/...

FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package.json        ./package.json
COPY tsconfig.json       ./tsconfig.json
COPY tsconfig.build.json ./tsconfig.build.json
COPY nest-cli.json       ./nest-cli.json

RUN npm install --ignore-scripts

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

RUN npm run build \
    && if [ ! -f dist/main.js ]; then echo "ERROR: dist/main.js not found after build"; ls -la dist/ 2>/dev/null || echo "(dist/ does not exist)"; exit 1; fi

EXPOSE 3000

ENV RUN_SEED=true

CMD ["sh", "-c", "npx prisma db push && node dist/database/seed-runner.js && node dist/main"]
