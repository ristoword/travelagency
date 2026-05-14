/**
 * Seed runner — compiled to dist/database/seed-runner.js
 * Called at startup when RUN_SEED=true OR when database is empty
 * Usage: node dist/database/seed-runner.js
 */
import { PrismaClient, TenantPlan, UserStatus, TaskPriority, TaskStatus, CommunicationChannel, CommunicationStatus } from '@prisma/client';
import { hashPassword } from '../common/utils/hash.util';

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
    where: { tenantId_email: { tenantId: tenant.id, email: 'basilepaolo@me.com' } },
    update: { password: await hashPassword('Bimb@'), status: UserStatus.ACTIVE, isEmailVerified: true },
    create: {
      tenantId: tenant.id, email: 'basilepaolo@me.com',
      password: await hashPassword('Bimb@'),
      firstName: 'Paolo', lastName: 'Basile',
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
      password: await hashPassword('Agent123!'),
      firstName: 'Marco', lastName: 'Rossi',
      status: UserStatus.ACTIVE, isEmailVerified: true,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: agentUser.id, roleId: agentRole.id } },
    update: {}, create: { userId: agentUser.id, roleId: agentRole.id },
  });
  console.log(`   ✓ Admin: basilepaolo@me.com / Bimb@`);
  console.log(`   ✓ Agent: agente@demo-agenzia.it / Agent123!`);

  // ── SuperAdmin tenant + user ───────────────────────────────────────────────
  const superadminTenant = await prisma.tenant.upsert({
    where: { slug: '_superadmin' },
    update: {},
    create: {
      name: 'SuperAdmin System', slug: '_superadmin',
      email: 'system@platform.internal',
      plan: TenantPlan.ENTERPRISE, isActive: true, isVerified: true,
    },
  });

  const superadminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: superadminTenant.id, email: 'basilepaolo@me.com' } },
    update: { password: await hashPassword('Bimb@2015'), status: UserStatus.ACTIVE, isSuperAdmin: true, isEmailVerified: true },
    create: {
      tenantId: superadminTenant.id, email: 'basilepaolo@me.com',
      password: await hashPassword('Bimb@2015'),
      firstName: 'Paolo', lastName: 'Basile',
      status: UserStatus.ACTIVE, isSuperAdmin: true, isEmailVerified: true,
    },
  });
  console.log(`   ✓ SuperAdmin: basilepaolo@me.com / Bimb@2015 (tenant: _superadmin)`);

  // ── Demo workflow tasks ────────────────────────────────────────────────────
  const taskData = [
    { title: 'Confermare prenotazione volo per famiglia Bianchi', priority: TaskPriority.HIGH, dueDate: new Date(Date.now() + 2 * 86400000) },
    { title: 'Inviare preventivo tour Giappone - Lead Marchetti', priority: TaskPriority.URGENT, dueDate: new Date(Date.now() + 86400000) },
    { title: 'Rinnovare polizza assicurativa viaggi', priority: TaskPriority.MEDIUM, dueDate: new Date(Date.now() + 7 * 86400000) },
    { title: 'Follow-up cliente Verdi dopo viaggio NYC', priority: TaskPriority.LOW, dueDate: new Date(Date.now() + 3 * 86400000) },
    { title: 'Aggiornare catalogo pacchetti estate 2026', priority: TaskPriority.MEDIUM, dueDate: new Date(Date.now() + 14 * 86400000) },
  ];
  for (const t of taskData) {
    const exists = await prisma.task.findFirst({ where: { tenantId: tenant.id, title: t.title } });
    if (!exists) {
      await prisma.task.create({
        data: {
          tenantId: tenant.id, title: t.title, priority: t.priority,
          status: TaskStatus.TODO, dueDate: t.dueDate,
          assignedToId: adminUser.id, createdById: adminUser.id,
          tags: [],
        },
      });
    }
  }
  console.log(`   ✓ ${taskData.length} demo tasks`);

  // ── Demo communications ────────────────────────────────────────────────────
  const commData = [
    { channel: CommunicationChannel.EMAIL, toAddress: 'mario.rossi@example.com', subject: 'Conferma prenotazione - Tour Giappone', body: 'Gentile Mario, la sua prenotazione è confermata.', status: CommunicationStatus.DELIVERED },
    { channel: CommunicationChannel.EMAIL, toAddress: 'laura.bianchi@example.com', subject: 'Preventivo viaggio famiglia - Maldive 2026', body: 'In allegato il preventivo per il viaggio alle Maldive.', status: CommunicationStatus.READ },
    { channel: CommunicationChannel.WHATSAPP, toAddress: '+39333123456', subject: undefined, body: 'Buongiorno! Il suo volo è confermato per il 15/07. Buon viaggio! ✈️', status: CommunicationStatus.SENT },
    { channel: CommunicationChannel.EMAIL, toAddress: 'giuseppe.verdi@azienda.it', subject: 'Riepilogo preventivo team building - Costa Brava', body: 'Come concordato, allego il preventivo per l\'evento aziendale.', status: CommunicationStatus.SENT },
  ];
  for (const c of commData) {
    const exists = await prisma.communication.findFirst({ where: { tenantId: tenant.id, toAddress: c.toAddress, subject: c.subject } });
    if (!exists) {
      await prisma.communication.create({
        data: {
          tenantId: tenant.id, channel: c.channel, direction: 'OUTBOUND',
          toAddress: c.toAddress, subject: c.subject,
          body: c.body, status: c.status,
          authorId: adminUser.id,
          sentAt: (c.status as string) !== CommunicationStatus.QUEUED ? new Date() : undefined,
        },
      });
    }
  }
  console.log(`   ✓ ${commData.length} demo communications`);

  // ── Default settings ───────────────────────────────────────────────────────
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
  console.log('📌 Admin:      basilepaolo@me.com / Bimb@       (tenant: demo-agenzia)');
  console.log('📌 Agent:      agente@demo-agenzia.it / Agent123! (tenant: demo-agenzia)');
  console.log('📌 SuperAdmin: basilepaolo@me.com / Bimb@2015   (tenant: _superadmin) → /superadmin');
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
