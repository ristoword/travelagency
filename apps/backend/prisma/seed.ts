import {
  PrismaClient,
  TenantPlan,
  UserStatus,
  ClientType,
  ClientStatus,
  ClientSource,
  LeadStatus,
  LeadPriority,
  LeadSource,
  TagType,
  NoteType,
  HistoryEventType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// =============================================
// ALL SYSTEM PERMISSIONS (FASE 1 + FASE 2)
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
  // Settings
  { resource: 'settings', action: 'read', description: 'View settings' },
  { resource: 'settings', action: 'update', description: 'Manage settings' },
  // Audit
  { resource: 'audit', action: 'read', description: 'View audit log' },
  // ── CRM ──
  // Clients
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
  { resource: 'leads', action: 'convert', description: 'Convert lead to client' },
  // ── Sales ──
  { resource: 'quotations', action: 'create', description: 'Create quotations' },
  { resource: 'quotations', action: 'read', description: 'View quotations' },
  { resource: 'quotations', action: 'update', description: 'Update quotations' },
  { resource: 'quotations', action: 'delete', description: 'Delete quotations' },
  { resource: 'quotations', action: 'approve', description: 'Approve quotations' },
  { resource: 'quotations', action: 'export', description: 'Export quotation as PDF' },
  // ── Travel Cases ──
  { resource: 'cases', action: 'create', description: 'Create travel cases' },
  { resource: 'cases', action: 'read', description: 'View travel cases' },
  { resource: 'cases', action: 'update', description: 'Update travel cases' },
  { resource: 'cases', action: 'delete', description: 'Delete travel cases' },
  // ── Bookings ──
  { resource: 'bookings', action: 'create', description: 'Create bookings' },
  { resource: 'bookings', action: 'read', description: 'View bookings' },
  { resource: 'bookings', action: 'update', description: 'Update bookings' },
  { resource: 'bookings', action: 'delete', description: 'Delete bookings' },
  { resource: 'bookings', action: 'cancel', description: 'Cancel bookings' },
  // ── Accounting ──
  { resource: 'invoices', action: 'create', description: 'Create invoices' },
  { resource: 'invoices', action: 'read', description: 'View invoices' },
  { resource: 'invoices', action: 'update', description: 'Update invoices' },
  { resource: 'invoices', action: 'delete', description: 'Delete invoices' },
  { resource: 'invoices', action: 'export', description: 'Export invoices' },
  // ── Documents ──
  { resource: 'documents', action: 'create', description: 'Upload documents' },
  { resource: 'documents', action: 'read', description: 'View documents' },
  { resource: 'documents', action: 'delete', description: 'Delete documents' },
  // ── Analytics ──
  { resource: 'analytics', action: 'read', description: 'View analytics' },
  { resource: 'analytics', action: 'export', description: 'Export analytics' },
  // ── Suppliers ──
  { resource: 'suppliers', action: 'create', description: 'Create suppliers' },
  { resource: 'suppliers', action: 'read', description: 'View suppliers' },
  { resource: 'suppliers', action: 'update', description: 'Update suppliers' },
  { resource: 'suppliers', action: 'delete', description: 'Delete suppliers' },
  // Permissions
  { resource: 'permissions', action: 'read', description: 'View permissions' },
];

const SYSTEM_ROLES = {
  admin: {
    name: 'Amministratore',
    description: 'Accesso completo a tutte le funzionalità del tenant',
    permissions: PERMISSIONS.map((p) => `${p.resource}:${p.action}`),
  },
  agent: {
    name: 'Agente di Viaggio',
    description: 'Gestione clienti, lead, preventivi e pratiche viaggio',
    permissions: [
      'clients:create', 'clients:read', 'clients:update',
      'leads:create', 'leads:read', 'leads:update', 'leads:convert',
      'quotations:create', 'quotations:read', 'quotations:update', 'quotations:export',
      'cases:create', 'cases:read', 'cases:update',
      'bookings:create', 'bookings:read', 'bookings:update',
      'invoices:read', 'documents:create', 'documents:read', 'suppliers:read',
    ],
  },
  accountant: {
    name: 'Contabile',
    description: 'Gestione fatture, pagamenti e contabilità',
    permissions: [
      'clients:read', 'bookings:read',
      'invoices:create', 'invoices:read', 'invoices:update', 'invoices:export',
      'analytics:read', 'analytics:export', 'documents:read',
    ],
  },
  readonly: {
    name: 'Visualizzatore',
    description: 'Accesso in sola lettura',
    permissions: [
      'clients:read', 'leads:read', 'quotations:read',
      'cases:read', 'bookings:read', 'invoices:read', 'analytics:read',
    ],
  },
};

async function main() {
  console.log('🌱 Starting database seed (FASE 1 + FASE 2)...\n');

  // ── 1. Permissions ─────────────────────────
  console.log('📋 Creating permissions...');
  await prisma.permission.createMany({ data: PERMISSIONS, skipDuplicates: true });
  const allPerms = await prisma.permission.findMany();
  const permMap = new Map(allPerms.map((p) => [`${p.resource}:${p.action}`, p.id]));
  console.log(`   ✓ ${allPerms.length} permissions`);

  // ── 2. Demo Tenant ─────────────────────────
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

  // ── 3. Roles + Permissions ─────────────────
  console.log('\n👥 Creating roles...');
  const createdRoles: Record<string, string> = {};

  for (const [key, roleData] of Object.entries(SYSTEM_ROLES)) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: roleData.name } },
      update: {},
      create: { tenantId: tenant.id, name: roleData.name, description: roleData.description, isSystem: true },
    });
    createdRoles[key] = role.id;

    const permIds = roleData.permissions.map((p) => permMap.get(p)).filter(Boolean) as string[];
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }
    console.log(`   ✓ ${role.name} (${permIds.length} permissions)`);
  }

  // ── 4. Users ───────────────────────────────
  console.log('\n👤 Creating users...');
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
    where: { userId_roleId: { userId: adminUser.id, roleId: createdRoles.admin } },
    update: {}, create: { userId: adminUser.id, roleId: createdRoles.admin },
  });
  console.log(`   ✓ Admin: admin@demo-agenzia.it / Admin123!`);

  const agentUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'agente@demo-agenzia.it' } },
    update: {},
    create: {
      tenantId: tenant.id, email: 'agente@demo-agenzia.it',
      password: await bcrypt.hash('Agent123!', 12),
      firstName: 'Marco', lastName: 'Rossi',
      phone: '+39 333 1234567',
      status: UserStatus.ACTIVE, isEmailVerified: true,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: agentUser.id, roleId: createdRoles.agent } },
    update: {}, create: { userId: agentUser.id, roleId: createdRoles.agent },
  });
  console.log(`   ✓ Agent: agente@demo-agenzia.it / Agent123!`);

  // ── 5. Default Settings ────────────────────
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
  for (const s of defaultSettings) {
    await prisma.tenantSetting.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: s.key } },
      update: {}, create: { tenantId: tenant.id, key: s.key, value: s.value as string | number },
    });
  }
  console.log('\n⚙️  Default settings created');

  // ── 6. CRM Tags ────────────────────────────
  console.log('\n🏷️  Creating demo tags...');
  const tagsData = [
    { name: 'VIP', color: '#f59e0b', type: TagType.CLIENT },
    { name: 'Newsletter', color: '#10b981', type: TagType.CLIENT },
    { name: 'Fidelizzato', color: '#6366f1', type: TagType.CLIENT },
    { name: 'Corporate', color: '#3b82f6', type: TagType.CLIENT },
    { name: 'Referral', color: '#ec4899', type: TagType.LEAD },
    { name: 'Caldo', color: '#ef4444', type: TagType.LEAD },
    { name: 'Da richiamare', color: '#f97316', type: TagType.LEAD },
    { name: 'Luna di miele', color: '#d946ef', type: TagType.GENERAL },
    { name: 'Famiglia', color: '#06b6d4', type: TagType.GENERAL },
    { name: 'Avventura', color: '#84cc16', type: TagType.GENERAL },
  ];

  const createdTags: Record<string, string> = {};
  for (const t of tagsData) {
    const tag = await prisma.tag.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: t.name } },
      update: {}, create: { tenantId: tenant.id, ...t },
    });
    createdTags[t.name] = tag.id;
  }
  console.log(`   ✓ ${tagsData.length} tags`);

  // ── 7. Demo Clients ────────────────────────
  console.log('\n👥 Creating demo clients...');
  const clientsData = [
    {
      firstName: 'Giuseppe', lastName: 'Ferrari',
      email: 'giuseppe.ferrari@email.it', mobile: '+39 347 1111111',
      type: ClientType.INDIVIDUAL, status: ClientStatus.ACTIVE,
      source: ClientSource.REFERRAL, isVip: true,
      city: 'Milano', country: 'IT',
      preferredCurrency: 'EUR', preferredLanguage: 'it',
      assignedToId: agentUser.id,
      tags: ['VIP', 'Fidelizzato'],
    },
    {
      firstName: 'Lucia', lastName: 'Conti',
      email: 'lucia.conti@email.it', phone: '+39 06 2222222', mobile: '+39 333 2222222',
      type: ClientType.INDIVIDUAL, status: ClientStatus.ACTIVE,
      source: ClientSource.WEBSITE, isVip: false,
      city: 'Roma', country: 'IT',
      assignedToId: agentUser.id,
      tags: ['Newsletter'],
    },
    {
      companyName: 'TechCorp S.r.l.', vatNumber: 'IT09876543210',
      email: 'travel@techcorp.it', phone: '+39 02 9876543',
      type: ClientType.COMPANY, status: ClientStatus.ACTIVE,
      source: ClientSource.WALK_IN, isVip: true,
      city: 'Milano', country: 'IT',
      tags: ['VIP', 'Corporate'],
    },
    {
      firstName: 'Roberto', lastName: 'Bianchi',
      email: 'roberto.bianchi@email.it', mobile: '+39 347 3333333',
      type: ClientType.INDIVIDUAL, status: ClientStatus.ACTIVE,
      source: ClientSource.REFERRAL,
      city: 'Torino', country: 'IT',
      tags: ['Fidelizzato'],
    },
  ];

  const clientIds: string[] = [];
  for (const { tags, ...data } of clientsData) {
    const client = await prisma.client.create({
      data: { tenantId: tenant.id, ...data },
    });
    clientIds.push(client.id);

    for (const tagName of tags) {
      if (createdTags[tagName]) {
        await prisma.clientTag.upsert({
          where: { clientId_tagId: { clientId: client.id, tagId: createdTags[tagName] } },
          update: {}, create: { clientId: client.id, tagId: createdTags[tagName] },
        });
      }
    }

    await prisma.customerHistory.create({
      data: {
        tenantId: tenant.id, clientId: client.id,
        eventType: HistoryEventType.CLIENT_CREATED,
        title: 'Cliente creato',
        description: `Cliente aggiunto al CRM`,
      },
    });

    await prisma.customerNote.create({
      data: {
        tenantId: tenant.id, clientId: client.id,
        type: NoteType.GENERAL, isPrivate: false,
        content: `Cliente acquisito tramite ${data.source}. Preferisce essere contattato via email.`,
        authorId: agentUser.id,
      },
    });
  }
  console.log(`   ✓ ${clientsData.length} clients`);

  // Contacts for first client
  await prisma.contact.createMany({
    data: [
      {
        tenantId: tenant.id, clientId: clientIds[0],
        firstName: 'Maria', lastName: 'Ferrari', email: 'maria.ferrari@email.it',
        role: 'Coniuge', isPrimary: true,
      },
      {
        tenantId: tenant.id, clientId: clientIds[0],
        firstName: 'Luca', lastName: 'Ferrari',
        role: 'Figlio', isPrimary: false,
      },
    ],
    skipDuplicates: true,
  });

  // ── 8. Demo Leads ──────────────────────────
  console.log('\n📋 Creating demo leads...');
  const leadsData = [
    {
      firstName: 'Alessia', lastName: 'Moretti',
      email: 'alessia.moretti@email.it', mobile: '+39 347 4444444',
      status: LeadStatus.NEW, priority: LeadPriority.HIGH,
      source: LeadSource.WEBSITE,
      destination: 'Maldive', departureDate: new Date('2025-08-15'),
      returnDate: new Date('2025-08-29'),
      numberOfPeople: 2, budget: 8000,
      travelType: 'honeymoon',
      description: 'Coppia in viaggio di nozze, cercano resort 5 stelle con pensione completa',
      assignedToId: agentUser.id,
      tags: ['Caldo', 'Luna di miele'],
    },
    {
      firstName: 'Paolo', lastName: 'Greco',
      email: 'paolo.greco@email.it', phone: '+39 06 5555555',
      status: LeadStatus.CONTACTED, priority: LeadPriority.MEDIUM,
      source: LeadSource.PHONE,
      destination: 'New York', departureDate: new Date('2025-12-20'),
      returnDate: new Date('2025-12-30'),
      numberOfPeople: 4, budget: 6000,
      travelType: 'family',
      description: 'Famiglia con 2 figli, vacanza di Natale a New York',
      assignedToId: agentUser.id,
      tags: ['Famiglia'],
    },
    {
      firstName: 'Carla', lastName: 'Ricci',
      email: 'carla.ricci@email.it', mobile: '+39 347 6666666',
      status: LeadStatus.QUALIFIED, priority: LeadPriority.URGENT,
      source: LeadSource.REFERRAL,
      destination: 'Giappone', departureDate: new Date('2025-04-01'),
      returnDate: new Date('2025-04-15'),
      numberOfPeople: 2, budget: 5000,
      travelType: 'culture',
      description: 'Coppia appassionata di cultura giapponese, periodo hanami',
      assignedToId: agentUser.id,
      tags: ['Caldo', 'Referral'],
    },
    {
      firstName: 'Marco', lastName: 'Esposito',
      email: 'marco.esposito@azienda.it', phone: '+39 02 7777777',
      status: LeadStatus.PROPOSAL_SENT, priority: LeadPriority.HIGH,
      source: LeadSource.EMAIL,
      destination: 'Dubai', departureDate: new Date('2025-03-10'),
      returnDate: new Date('2025-03-14'),
      numberOfPeople: 1, budget: 3000,
      travelType: 'business',
      description: 'Viaggio d\'affari, necessita hotel 5 stelle con sala conferenze',
      assignedToId: agentUser.id,
      tags: ['Da richiamare'],
    },
    {
      firstName: 'Sofia', lastName: 'Lombardi',
      email: 'sofia.lombardi@email.it', mobile: '+39 347 8888888',
      status: LeadStatus.LOST, priority: LeadPriority.LOW,
      source: LeadSource.SOCIAL_MEDIA,
      destination: 'Barcellona',
      numberOfPeople: 3, budget: 2000,
      travelType: 'city_break',
      description: 'Weekend lungo a Barcellona con amiche',
      lostReason: 'Ha prenotato direttamente online',
      tags: [],
    },
  ];

  for (const { tags, ...data } of leadsData) {
    const lead = await prisma.lead.create({
      data: { tenantId: tenant.id, ...data },
    });

    for (const tagName of tags) {
      if (createdTags[tagName]) {
        await prisma.leadTag.upsert({
          where: { leadId_tagId: { leadId: lead.id, tagId: createdTags[tagName] } },
          update: {}, create: { leadId: lead.id, tagId: createdTags[tagName] },
        });
      }
    }

    await prisma.customerHistory.create({
      data: {
        tenantId: tenant.id, leadId: lead.id,
        eventType: HistoryEventType.LEAD_CREATED,
        title: 'Lead acquisito',
        description: `${lead.firstName} ${lead.lastName} — ${lead.destination || 'destinazione n.d.'}`,
      },
    });

    if (data.status !== LeadStatus.NEW) {
      await prisma.customerNote.create({
        data: {
          tenantId: tenant.id, leadId: lead.id,
          type: NoteType.CALL, content: `Primo contatto effettuato. Cliente interessato. Richiesta dettagli inviata.`,
          authorId: agentUser.id,
        },
      });
    }
  }
  console.log(`   ✓ ${leadsData.length} leads`);

  // ── 9. Client Preferences ──────────────────
  await prisma.customerPreference.createMany({
    data: [
      { tenantId: tenant.id, clientId: clientIds[0], key: 'cabin_class', value: 'business' },
      { tenantId: tenant.id, clientId: clientIds[0], key: 'meal_preference', value: 'standard' },
      { tenantId: tenant.id, clientId: clientIds[0], key: 'hotel_category', value: 5 },
      { tenantId: tenant.id, clientId: clientIds[1], key: 'cabin_class', value: 'economy' },
      { tenantId: tenant.id, clientId: clientIds[1], key: 'meal_preference', value: 'vegetarian' },
    ],
    skipDuplicates: true,
  });
  console.log('\n⚙️  Client preferences created');

  console.log('\n✅ Seed completed!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 Login credentials:');
  console.log('   Admin:  admin@demo-agenzia.it  / Admin123!');
  console.log('   Agent:  agente@demo-agenzia.it / Agent123!');
  console.log('   Tenant: demo-agenzia (X-Tenant-Slug header)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
