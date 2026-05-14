# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
Travel Agency Management System (TAMS) — enterprise multi-tenant management platform for travel agencies.
- **Backend**: NestJS + Prisma + PostgreSQL (port 3000)
- **Frontend Admin**: Next.js 14 (port 3001)
- Monorepo managed by pnpm workspaces + Turborepo

### Prerequisites
- Docker must be running for PostgreSQL (`sudo dockerd` if not started, then `sudo docker compose up -d postgres`)
- `.env` must exist in root, `apps/backend/`, and `apps/frontend-admin/` (copy from `.env.example`)

### Running services
- Backend: `cd apps/backend && pnpm start:dev` (port 3000)
- Frontend: `cd apps/frontend-admin && pnpm dev` (port 3001)
- Or from root: `pnpm dev` (starts both via Turborepo)

### Key commands (see `package.json` scripts in each app)
- Lint backend: `cd apps/backend && pnpm lint`
- Lint frontend: `cd apps/frontend-admin && pnpm lint`
- Build backend: `cd apps/backend && pnpm build`
- Tests: `cd apps/backend && pnpm test` (no test files written yet; use `--passWithNoTests`)
- Prisma push: `cd apps/backend && npx prisma db push`
- Prisma seed: `cd apps/backend && npx ts-node prisma/seed.ts`

### Multi-tenancy
Every API request must include `X-Tenant-Slug` header. Default demo tenant: `demo-agenzia`.
SuperAdmin tenant slug: `_superadmin`.

### Gotchas discovered during setup
1. **Prisma needs `.env` in `apps/backend/`** — the root `.env` is not picked up by Prisma CLI when run from the backend directory. Always copy/symlink `.env` to `apps/backend/.env`.
2. **`seed-runner.ts` TS error** — `src/database/seed-runner.ts` had a false-positive TypeScript error (`CommunicationStatus.QUEUED` comparison) that blocked `nest start --watch`. Fixed with a `as string` cast.
3. **JWT strategy missing `isSuperAdmin`** — `jwt.strategy.ts` did not return `isSuperAdmin` from `validate()`, causing `SuperAdminGuard` to always reject. Fixed by adding `isSuperAdmin: payload.isSuperAdmin` to the return value.
4. **ESLint configs were missing** — `.eslintrc.js` (backend) and `.eslintrc.json` (frontend) were not committed. Created standard NestJS/Next.js configs.
5. **Backend lint has 32 pre-existing errors** — mostly unused imports. These are not blocking but should be cleaned up.
6. **No test files exist** — `pnpm test` exits with code 1 (no specs). Use `--passWithNoTests` flag if running in CI.
7. **SMTP warning on startup is expected** — `.env.example` has placeholder Gmail credentials. Email features won't work without real SMTP config.
8. **Optional Docker services** — Redis, MinIO, RabbitMQ, Elasticsearch are in docker-compose but not required for the app to run. Only PostgreSQL is needed.

### Credentials (dev environment)
| Role | Email | Tenant Slug |
|------|-------|-------------|
| Admin | basilepaolo@me.com | demo-agenzia |
| SuperAdmin | basilepaolo@me.com | _superadmin |
| Agent | agente@demo-agenzia.it | demo-agenzia |

### API documentation
Swagger UI: http://localhost:3000/api/docs

### API route patterns
- Versioned routes: `/api/v1/...` (auth, users, roles, clients, leads, etc.)
- Unversioned routes: `/api/superadmin/...` (superadmin controller has no version decorator)
- Health: `/health`
