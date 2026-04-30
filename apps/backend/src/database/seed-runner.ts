/**
 * Seed runner — compiled to dist/database/seed-runner.js
 * Called at startup when RUN_SEED=true OR when database is empty
 * Usage: node dist/database/seed-runner.js
 */
import { PrismaClient, TenantPlan, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function checkIfSeeded(): Promise<boolean> {
  try {
    const count = await prisma.tenant.count();
    return count > 0;
  } catch {
    return false;
  }
}

async function seedBase() {
  console.log('\n🌱 Auto-seeding database...\n');

  // Permissions
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

  await prisma.permission.createMany({ data: PERMISSIONS, skipDuplicates: true });
  const allPerms = await prisma.permission.findMany();
  const permMap = new Map(allPerms.map(p => [`${p.resource}:${p.action}`, p.id]));
  console.log(`   ✓ ${allPerms.length} permissions`);

  // Demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-agenzia' },
    update: {},
    create: {
      name: 'Demo Agenzia Viaggi', slug: 'demo-agenzia',
      email: 'info@demo-agenzia.it', phone: '+39 06 1234567',
      address: 'Via Roma 1', city: 'Roma', country: 'IT',
      vatNumber: 'IT12345678901', plan: TenantPlan.PROFESSIONAL, isActive: true,
    },
  });
  console.log(`   ✓ Tenant: ${tenant.name}`);

  // Admin role
  const adminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Amministratore' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Amministratore', description: 'Accesso completo', isSystem: true },
  });
  const allPermIds = allPerms.map(p => p.id);
  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: allPermIds.map(permissionId => ({ roleId: adminRole.id, permissionId })),
    skipDuplicates: true,
  });

  // Agent role
  const agentPerms = ['clients:create','clients:read','clients:update','leads:create','leads:read','leads:update','leads:convert',
    'quotations:create','quotations:read','quotations:update','quotations:export','cases:create','cases:read','cases:update',
    'bookings:create','bookings:read','bookings:update','invoices:read','documents:create','documents:read','suppliers:read',
    'communications:create','communications:read','communications:send'];
  const agentRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Agente di Viaggio' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Agente di Viaggio', description: 'Gestione clienti e pratiche', isSystem: true },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: agentRole.id } });
  const agentPermIds = agentPerms.map(p => permMap.get(p)).filter(Boolean) as string[];
  await prisma.rolePermission.createMany({
    data: agentPermIds.map(permissionId => ({ roleId: agentRole.id, permissionId })),
    skipDuplicates: true,
  });
  console.log(`   ✓ Roles: Amministratore, Agente di Viaggio`);

  // Admin user
  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo-agenzia.it' } },
    update: {},
    create: {
      tenantId: tenant.id, email: 'admin@demo-agenzia.it',
      password: await bcrypt.hash('Admin123!', 12),
      firstName: 'Admin', lastName: 'Demo',
      status: UserStatus.ACTIVE, isEmailVerified: true,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {}, create: { userId: adminUser.id, roleId: adminRole.id },
  });

  const agentUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'agente@demo-agenzia.it' } },
    update: {},
    create: {
      tenantId: tenant.id, email: 'agente@demo-agenzia.it',
      password: await bcrypt.hash('Agent123!', 12),
      firstName: 'Marco', lastName: 'Rossi',
      status: UserStatus.ACTIVE, isEmailVerified: true,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: agentUser.id, roleId: agentRole.id } },
    update: {}, create: { userId: agentUser.id, roleId: agentRole.id },
  });
  console.log(`   ✓ Users: admin@demo-agenzia.it / Admin123!`);
  console.log(`   ✓ Users: agente@demo-agenzia.it / Agent123!`);

  // Default settings
  const settings = [
    { key: 'default_currency', value: 'EUR' }, { key: 'default_language', value: 'it' },
    { key: 'vat_rate', value: 22 }, { key: 'invoice_prefix', value: 'FT' },
    { key: 'quotation_validity_days', value: 30 }, { key: 'timezone', value: 'Europe/Rome' },
  ];
  for (const s of settings) {
    await prisma.tenantSetting.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: s.key } },
      update: {}, create: { tenantId: tenant.id, key: s.key, value: s.value as string | number },
    });
  }

  console.log('\n✅ Database seeded successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 Login: admin@demo-agenzia.it / Admin123!');
  console.log('📌 Tenant: demo-agenzia (X-Tenant-Slug header)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function main() {
  const forceReseed = process.env.RUN_SEED === 'true';
  const alreadySeeded = await checkIfSeeded();

  if (alreadySeeded && !forceReseed) {
    console.log('ℹ️  Database already has data — skipping seed (set RUN_SEED=true to force)');
    return;
  }

  await seedBase();
}

main()
  .catch(e => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
