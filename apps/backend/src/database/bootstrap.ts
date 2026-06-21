/**
 * Database bootstrap — solo dati di sistema (permessi, superadmin, tenant iniziale).
 * Nessun dato demo/mock. I dati operativi si creano dall'app.
 */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient, TenantPlan, UserStatus } from '@prisma/client';
import { hashPassword } from '../common/utils/hash.util';

function loadEnvFiles() {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../.env'),
    resolve(process.cwd(), '../../.env'),
    resolve(__dirname, '../../../.env'),
    resolve(__dirname, '../../.env'),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key] !== undefined) continue;
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

let envLoaded = false;
function ensureEnv() {
  if (!envLoaded) {
    loadEnvFiles();
    envLoaded = true;
  }
}

const PERMISSIONS = [
  { resource: 'users', action: 'create' }, { resource: 'users', action: 'read' },
  { resource: 'users', action: 'update' }, { resource: 'users', action: 'delete' },
  { resource: 'roles', action: 'create' }, { resource: 'roles', action: 'read' },
  { resource: 'roles', action: 'update' }, { resource: 'roles', action: 'delete' },
  { resource: 'permissions', action: 'read' },
  { resource: 'settings', action: 'read' }, { resource: 'settings', action: 'update' },
  { resource: 'audit', action: 'read' },
  { resource: 'clients', action: 'create' }, { resource: 'clients', action: 'read' },
  { resource: 'clients', action: 'update' }, { resource: 'clients', action: 'delete' },
  { resource: 'clients', action: 'export' },
  { resource: 'leads', action: 'create' }, { resource: 'leads', action: 'read' },
  { resource: 'leads', action: 'update' }, { resource: 'leads', action: 'delete' },
  { resource: 'leads', action: 'convert' },
  { resource: 'quotations', action: 'create' }, { resource: 'quotations', action: 'read' },
  { resource: 'quotations', action: 'update' }, { resource: 'quotations', action: 'delete' },
  { resource: 'quotations', action: 'approve' }, { resource: 'quotations', action: 'export' },
  { resource: 'cases', action: 'create' }, { resource: 'cases', action: 'read' },
  { resource: 'cases', action: 'update' }, { resource: 'cases', action: 'delete' },
  { resource: 'bookings', action: 'create' }, { resource: 'bookings', action: 'read' },
  { resource: 'bookings', action: 'update' }, { resource: 'bookings', action: 'delete' },
  { resource: 'bookings', action: 'cancel' },
  { resource: 'invoices', action: 'create' }, { resource: 'invoices', action: 'read' },
  { resource: 'invoices', action: 'update' }, { resource: 'invoices', action: 'delete' },
  { resource: 'invoices', action: 'export' },
  { resource: 'documents', action: 'create' }, { resource: 'documents', action: 'read' },
  { resource: 'documents', action: 'delete' },
  { resource: 'analytics', action: 'read' }, { resource: 'analytics', action: 'export' },
  { resource: 'suppliers', action: 'create' }, { resource: 'suppliers', action: 'read' },
  { resource: 'suppliers', action: 'update' }, { resource: 'suppliers', action: 'delete' },
  { resource: 'communications', action: 'create' }, { resource: 'communications', action: 'read' },
  { resource: 'communications', action: 'send' },
];

const DEFAULT_SETTINGS = [
  { key: 'default_currency', value: 'EUR' },
  { key: 'default_language', value: 'it' },
  { key: 'vat_rate', value: 22 },
  { key: 'invoice_prefix', value: 'FT' },
  { key: 'quotation_validity_days', value: 30 },
  { key: 'timezone', value: 'Europe/Rome' },
];

function envFlag(name: string): boolean {
  return ['true', '1', 'yes'].includes((process.env[name] ?? '').toLowerCase());
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

export async function ensureSuperAdmin(prisma: PrismaClient) {
  ensureEnv();
  const email = requireEnv('SUPER_ADMIN_EMAIL');
  const password = requireEnv('SUPER_ADMIN_PASSWORD');
  const firstName = process.env.SUPER_ADMIN_USERNAME?.trim() || 'Super';
  const lastName = process.env.SUPER_ADMIN_LAST_NAME?.trim() || 'Admin';

  const tenant = await prisma.tenant.upsert({
    where: { slug: '_superadmin' },
    update: {},
    create: {
      name: 'SuperAdmin System',
      slug: '_superadmin',
      email: 'system@platform.internal',
      plan: TenantPlan.ENTERPRISE,
      isActive: true,
      isVerified: true,
    },
  });

  const hashed = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: email.toLowerCase() } },
    update: {
      password: hashed,
      status: UserStatus.ACTIVE,
      isSuperAdmin: true,
      isEmailVerified: true,
      firstName,
      lastName,
    },
    create: {
      tenantId: tenant.id,
      email: email.toLowerCase(),
      password: hashed,
      firstName,
      lastName,
      status: UserStatus.ACTIVE,
      isSuperAdmin: true,
      isEmailVerified: true,
    },
  });

  return { tenant, user, email };
}

async function ensureOwnerTenant(prisma: PrismaClient, allPerms: { id: string }[]) {
  ensureEnv();
  if (!envFlag('DEV_OWNER_ENABLED')) return null;

  const email = requireEnv('DEV_OWNER_EMAIL');
  const password = requireEnv('DEV_OWNER_PASSWORD');
  const slug = process.env.DEV_OWNER_TENANT_SLUG?.trim() || 'agenzia-principale';
  const name = process.env.DEV_OWNER_TENANT_NAME?.trim() || 'Agenzia Viaggi';

  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: { isActive: true, isVerified: true },
    create: {
      name,
      slug,
      email,
      plan: TenantPlan.PROFESSIONAL,
      isActive: true,
      isVerified: true,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Amministratore' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Amministratore',
      description: 'Accesso completo',
      isSystem: true,
    },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: allPerms.map(p => ({ roleId: adminRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  const agentPerms = [
    'clients:create', 'clients:read', 'clients:update', 'leads:create', 'leads:read',
    'leads:update', 'leads:convert', 'quotations:create', 'quotations:read', 'quotations:update',
    'quotations:export', 'cases:create', 'cases:read', 'cases:update', 'bookings:create',
    'bookings:read', 'bookings:update', 'invoices:read', 'documents:create', 'documents:read',
    'suppliers:read', 'communications:create', 'communications:read', 'communications:send',
  ];
  const permMap = new Map(
    (await prisma.permission.findMany()).map(p => [`${p.resource}:${p.action}`, p.id]),
  );
  const agentRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Agente di Viaggio' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Agente di Viaggio',
      description: 'Gestione clienti e pratiche',
      isSystem: true,
    },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: agentRole.id } });
  await prisma.rolePermission.createMany({
    data: agentPerms.map(p => permMap.get(p)).filter(Boolean).map(permissionId => ({
      roleId: agentRole.id,
      permissionId: permissionId as string,
    })),
    skipDuplicates: true,
  });

  const hashed = await hashPassword(password);
  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: email.toLowerCase() } },
    update: {
      password: hashed,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      firstName: process.env.DEV_OWNER_FIRST_NAME?.trim() || 'Admin',
      lastName: process.env.DEV_OWNER_LAST_NAME?.trim() || 'Agenzia',
    },
    create: {
      tenantId: tenant.id,
      email: email.toLowerCase(),
      password: hashed,
      firstName: process.env.DEV_OWNER_FIRST_NAME?.trim() || 'Admin',
      lastName: process.env.DEV_OWNER_LAST_NAME?.trim() || 'Agenzia',
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  for (const s of DEFAULT_SETTINGS) {
    await prisma.tenantSetting.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: s.key } },
      update: {},
      create: { tenantId: tenant.id, key: s.key, value: s.value as string | number },
    });
  }

  // Compat: aggiorna password anche su vecchio tenant demo-agenzia se presente
  const legacy = await prisma.tenant.findUnique({ where: { slug: 'demo-agenzia' } });
  if (legacy) {
    await prisma.user.updateMany({
      where: { tenantId: legacy.id, email: email.toLowerCase() },
      data: { password: hashed, status: UserStatus.ACTIVE, isEmailVerified: true },
    });
  }

  return { tenant, adminUser, email, slug };
}

export async function ensurePermissions(prisma: PrismaClient) {
  await prisma.permission.createMany({ data: PERMISSIONS, skipDuplicates: true });
  return prisma.permission.findMany();
}

export async function bootstrapDatabase(prisma: PrismaClient) {
  const sa = await ensureSuperAdmin(prisma);
  console.log(`   ✓ SuperAdmin: ${sa.email} (tenant: _superadmin)`);

  const allPerms = await ensurePermissions(prisma);
  console.log(`   ✓ ${allPerms.length} permissions`);

  const owner = await ensureOwnerTenant(prisma, allPerms);
  if (owner) {
    console.log(`   ✓ Tenant: ${owner.slug} — admin ${owner.email}`);
  } else {
    console.log('   ℹ️  Tenant agenzia non creato (DEV_OWNER_ENABLED=false)');
  }

  return { superAdmin: sa, owner };
}
