# Travel Agency Management System

Sistema gestionale enterprise per agenzie di viaggio — architettura monorepo multi-tenant.

## Stack Tecnologico

| Layer | Tecnologia |
|-------|-----------|
| Backend API | NestJS + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Cache | Redis |
| Queue | RabbitMQ |
| File Storage | MinIO |
| Search | Elasticsearch |
| Auth | JWT + Refresh Token |
| Multi-tenancy | Row-level (tenant_id) |
| Monorepo | pnpm workspaces + Turborepo |

## Struttura del Progetto

```
apps/
  backend/               # NestJS REST API
  frontend-admin/        # Pannello amministrativo
  frontend-customer-portal/  # Portale clienti
  mobile-app/            # React Native app
  public-website/        # Sito pubblico
packages/
  shared-types/          # TypeScript types condivisi
  shared-ui/             # Componenti UI condivisi
  ...
```

## Quick Start

### Prerequisiti

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### 1. Setup ambiente

```bash
cp .env.example .env
# Modifica .env con le tue credenziali
```

### 2. Avvia i servizi infrastruttura

```bash
docker-compose up -d
```

### 3. Installa dipendenze

```bash
pnpm install
```

### 4. Database setup

```bash
cd apps/backend
pnpm prisma:migrate    # Applica migrations
pnpm prisma:seed       # Popola DB con dati iniziali
```

### 5. Avvia il backend

```bash
pnpm dev
# oppure solo il backend:
cd apps/backend && pnpm start:dev
```

### 6. API Documentation

Swagger disponibile su: http://localhost:3000/api/docs

## Credenziali Demo (dopo seed)

| Ruolo | Email | Password | Tenant Slug |
|-------|-------|----------|-------------|
| Admin | admin@demo-agenzia.it | Admin123! | demo-agenzia |
| Agente | agente@demo-agenzia.it | Agent123! | demo-agenzia |

> Aggiungere l'header `X-Tenant-Slug: demo-agenzia` ad ogni richiesta API,
> oppure passare `tenantSlug` nel body del login.

## API Endpoints — FASE 1

### Auth
```
POST   /api/v1/auth/login           Login
POST   /api/v1/auth/refresh         Refresh token
POST   /api/v1/auth/logout          Logout
GET    /api/v1/auth/me              Profilo utente autenticato
PATCH  /api/v1/auth/change-password Cambio password
```

### Users
```
POST   /api/v1/users                Crea utente
GET    /api/v1/users                Lista utenti (paginata)
GET    /api/v1/users/:id            Dettaglio utente
PATCH  /api/v1/users/:id            Modifica utente
PATCH  /api/v1/users/:id/toggle-status  Attiva/disattiva
POST   /api/v1/users/:id/roles      Assegna ruoli
DELETE /api/v1/users/:id            Elimina (soft)
```

### Roles
```
POST   /api/v1/roles                Crea ruolo
GET    /api/v1/roles                Lista ruoli
GET    /api/v1/roles/:id            Dettaglio ruolo
PATCH  /api/v1/roles/:id            Modifica ruolo
PATCH  /api/v1/roles/:id/permissions Sincronizza permessi
DELETE /api/v1/roles/:id            Elimina ruolo
```

### Permissions
```
GET    /api/v1/permissions          Lista permessi (con raggruppamento per risorsa)
GET    /api/v1/permissions/:id      Dettaglio permesso
```

### Settings
```
GET    /api/v1/settings             Tutti i settings (key-value map)
GET    /api/v1/settings/:key        Setting specifico
PUT    /api/v1/settings             Crea/aggiorna setting
PUT    /api/v1/settings/bulk        Bulk upsert settings
DELETE /api/v1/settings/:key        Elimina setting
```

### Audit Log
```
GET    /api/v1/audit-log            Log eventi con filtri
GET    /api/v1/audit-log/stats      Statistiche
GET    /api/v1/audit-log/:id        Dettaglio evento
```

### Tenants (super admin)
```
POST   /api/v1/tenants              Crea tenant
GET    /api/v1/tenants              Lista tenant
GET    /api/v1/tenants/:id          Dettaglio tenant
PATCH  /api/v1/tenants/:id          Modifica tenant
PATCH  /api/v1/tenants/:id/toggle-active  Attiva/disattiva
DELETE /api/v1/tenants/:id          Soft delete
```

### Health
```
GET    /health                      Health check (pubblico)
```

## Roadmap

- [x] **FASE 1** — Fondamenta: Auth, Users, Roles, Permissions, Tenants, Settings, Audit Log
- [ ] **FASE 2** — CRM: Clients, Leads, Contacts, Notes, Tags, Customer History
- [ ] **FASE 3** — Vendita: Opportunities, Quotations, Proposals, Pricing, Margins
- [ ] **FASE 4** — Pratica Viaggio: Cases, Passengers, Itineraries, Services, Timeline
