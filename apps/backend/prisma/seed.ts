import { PrismaClient, TenantPlan, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// =============================================
// ALL SYSTEM PERMISSIONS
// =============================================
const PERMISSIONS = [
  // Users
  { resource: 'users', action: 'create', description: 'Create users' },
  { resource: 'users', action: 'read', description: 'View users' },
  { resource: 'users', action: 'update', description: 'Update users' },
  { resource: 'users', action: 'delete', description: 'Delete users' },
  // Roles
  { resource: 'roles', action: 'create', description: 'Create roles' },
  { resource: 'roles', action: 'read', description: 'View roles' },
  { resource: 'roles', action: 'update', description: 'Update roles' },
  { resource: 'roles', action: 'delete', description: 'Delete roles' },
  // Permissions
  { resource: 'permissions', action: 'read', description: 'View permissions' },
  // Settings
  { resource: 'settings', action: 'read', description: 'View settings' },
  { resource: 'settings', action: 'update', description: 'Manage settings' },
  // Audit
  { resource: 'audit', action: 'read', description: 'View audit log' },
  // Clients (CRM)
  { resource: 'clients', action: 'create', description: 'Create clients' },
  { resource: 'clients', action: 'read', description: 'View clients' },
  { resource: 'clients', action: 'update', description: 'Update clients' },
  { resource: 'clients', action: 'delete', description: 'Delete clients' },
  { resource: 'clients', action: 'export', description: 'Export clients' },
  // Leads
  { resource: 'leads', action: 'create', description: 'Create leads' },
  { resource: 'leads', action: 'read', description: 'View leads' },
  { resource: 'leads', action: 'update', description: 'Update leads' },
  { resource: 'leads', action: 'delete', description: 'Delete leads' },
  { resource: 'leads', action: 'convert', description: 'Convert leads to clients' },
  // Quotations
  { resource: 'quotations', action: 'create', description: 'Create quotations' },
  { resource: 'quotations', action: 'read', description: 'View quotations' },
  { resource: 'quotations', action: 'update', description: 'Update quotations' },
  { resource: 'quotations', action: 'delete', description: 'Delete quotations' },
  { resource: 'quotations', action: 'approve', description: 'Approve quotations' },
  { resource: 'quotations', action: 'export', description: 'Export quotations as PDF' },
  // Travel Cases
  { resource: 'cases', action: 'create', description: 'Create travel cases' },
  { resource: 'cases', action: 'read', description: 'View travel cases' },
  { resource: 'cases', action: 'update', description: 'Update travel cases' },
  { resource: 'cases', action: 'delete', description: 'Delete travel cases' },
  // Bookings
  { resource: 'bookings', action: 'create', description: 'Create bookings' },
  { resource: 'bookings', action: 'read', description: 'View bookings' },
  { resource: 'bookings', action: 'update', description: 'Update bookings' },
  { resource: 'bookings', action: 'delete', description: 'Delete bookings' },
  { resource: 'bookings', action: 'cancel', description: 'Cancel bookings' },
  // Invoices
  { resource: 'invoices', action: 'create', description: 'Create invoices' },
  { resource: 'invoices', action: 'read', description: 'View invoices' },
  { resource: 'invoices', action: 'update', description: 'Update invoices' },
  { resource: 'invoices', action: 'delete', description: 'Delete invoices' },
  { resource: 'invoices', action: 'export', description: 'Export invoices' },
  // Documents
  { resource: 'documents', action: 'create', description: 'Upload documents' },
  { resource: 'documents', action: 'read', description: 'View documents' },
  { resource: 'documents', action: 'delete', description: 'Delete documents' },
  // Analytics
  { resource: 'analytics', action: 'read', description: 'View analytics' },
  { resource: 'analytics', action: 'export', description: 'Export analytics' },
  // Suppliers
  { resource: 'suppliers', action: 'create', description: 'Create suppliers' },
  { resource: 'suppliers', action: 'read', description: 'View suppliers' },
  { resource: 'suppliers', action: 'update', description: 'Update suppliers' },
  { resource: 'suppliers', action: 'delete', description: 'Delete suppliers' },
];

// =============================================
// SYSTEM ROLE DEFINITIONS
// =============================================
const SYSTEM_ROLES = {
  admin: {
    name: 'Amministratore',
    description: 'Accesso completo a tutte le funzionalità del tenant',
    permissions: PERMISSIONS.map((p) => `${p.resource}:${p.action}`),
  },
  agent: {
    name: 'Agente di Viaggio',
    description: 'Gestione clienti, preventivi e pratiche viaggio',
    permissions: [
      'clients:create', 'clients:read', 'clients:update',
      'leads:create', 'leads:read', 'leads:update', 'leads:convert',
      'quotations:create', 'quotations:read', 'quotations:update', 'quotations:export',
      'cases:create', 'cases:read', 'cases:update',
      'bookings:create', 'bookings:read', 'bookings:update',
      'invoices:read',
      'documents:create', 'documents:read',
      'suppliers:read',
    ],
  },
  accountant: {
    name: 'Contabile',
    description: 'Gestione fatture, pagamenti e contabilità',
    permissions: [
      'clients:read',
      'bookings:read',
      'invoices:create', 'invoices:read', 'invoices:update', 'invoices:export',
      'analytics:read', 'analytics:export',
      'documents:read',
    ],
  },
  readonly: {
    name: 'Visualizzatore',
    description: 'Accesso in sola lettura',
    permissions: [
      'clients:read',
      'leads:read',
      'quotations:read',
      'cases:read',
      'bookings:read',
      'invoices:read',
      'analytics:read',
    ],
  },
};

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ── 1. Create all permissions ──────────────────
  console.log('📋 Creating permissions...');
  await prisma.permission.createMany({
    data: PERMISSIONS,
    skipDuplicates: true,
  });

  const allPermissions = await prisma.permission.findMany();
  const permMap = new Map(
    allPermissions.map((p) => [`${p.resource}:${p.action}`, p.id]),
  );
  console.log(`   ✓ ${allPermissions.length} permissions`);

  // ── 2. Create demo tenant ─────────────────────
  console.log('\n🏢 Creating demo tenant...');
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-agenzia' },
    update: {},
    create: {
      name: 'Demo Agenzia Viaggi',
      slug: 'demo-agenzia',
      email: 'info@demo-agenzia.it',
      phone: '+39 06 1234567',
      address: 'Via Roma 1',
      city: 'Roma',
      country: 'IT',
      vatNumber: 'IT12345678901',
      plan: TenantPlan.PROFESSIONAL,
      isActive: true,
    },
  });
  console.log(`   ✓ Tenant: ${tenant.name} (${tenant.slug})`);

  // ── 3. Create system roles ────────────────────
  console.log('\n👥 Creating roles...');
  const createdRoles: Record<string, string> = {};

  for (const [key, roleData] of Object.entries(SYSTEM_ROLES)) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: roleData.name } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: roleData.name,
        description: roleData.description,
        isSystem: true,
      },
    });
    createdRoles[key] = role.id;

    // Assign permissions to role
    const permissionIds = roleData.permissions
      .map((p) => permMap.get(p))
      .filter(Boolean) as string[];

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }
    console.log(`   ✓ Role: ${role.name} (${permissionIds.length} permissions)`);
  }

  // ── 4. Create admin user ──────────────────────
  console.log('\n👤 Creating admin user...');
  const adminPassword = await bcrypt.hash('Admin123!', 12);

  const adminUser = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'admin@demo-agenzia.it' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@demo-agenzia.it',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'Demo',
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: createdRoles.admin } },
    update: {},
    create: { userId: adminUser.id, roleId: createdRoles.admin },
  });
  console.log(`   ✓ Admin: ${adminUser.email} / Admin123!`);

  // ── 5. Create sample agent user ───────────────
  const agentPassword = await bcrypt.hash('Agent123!', 12);
  const agentUser = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'agente@demo-agenzia.it' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'agente@demo-agenzia.it',
      password: agentPassword,
      firstName: 'Marco',
      lastName: 'Rossi',
      phone: '+39 333 1234567',
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: agentUser.id, roleId: createdRoles.agent } },
    update: {},
    create: { userId: agentUser.id, roleId: createdRoles.agent },
  });
  console.log(`   ✓ Agent: ${agentUser.email} / Agent123!`);

  // ── 6. Default tenant settings ────────────────
  console.log('\n⚙️  Creating default settings...');
  const defaultSettings = [
    { key: 'default_currency', value: 'EUR' },
    { key: 'default_language', value: 'it' },
    { key: 'vat_rate', value: 22 },
    { key: 'invoice_prefix', value: 'FT' },
    { key: 'quotation_validity_days', value: 30 },
    { key: 'fiscal_year_start', value: '01-01' },
    { key: 'booking_commission_default', value: 10 },
    { key: 'timezone', value: 'Europe/Rome' },
  ];

  for (const setting of defaultSettings) {
    await prisma.tenantSetting.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: setting.key } },
      update: {},
      create: {
        tenantId: tenant.id,
        key: setting.key,
        value: setting.value as string | number,
      },
    });
  }
  console.log(`   ✓ ${defaultSettings.length} default settings`);

  console.log('\n✅ Seed completed!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 Login credentials:');
  console.log(`   Admin:  admin@demo-agenzia.it / Admin123!`);
  console.log(`   Agent:  agente@demo-agenzia.it / Agent123!`);
  console.log(`   Tenant: demo-agenzia (X-Tenant-Slug header)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
