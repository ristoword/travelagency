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
  OpportunityStage,
  QuotationStatus,
  QuotationItemType,
  ProposalStatus,
  CaseStatus,
  CaseServiceType,
  CaseServiceStatus,
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

  // ── FASE 3: Opportunities ──────────────────
  console.log('\n💼 Creating demo opportunities...');
  const opp1 = await prisma.opportunity.create({
    data: {
      tenantId: tenant.id,
      title: 'Viaggio Maldive - Coppia Ferrari',
      stage: OpportunityStage.PROPOSAL,
      probability: 75,
      estimatedValue: 8000,
      currency: 'EUR',
      expectedCloseDate: new Date('2025-05-30'),
      clientId: clientIds[0],
      assignedToId: agentUser.id,
      notes: 'Cliente molto interessato, ha già scelto il resort',
    },
  });
  const opp2 = await prisma.opportunity.create({
    data: {
      tenantId: tenant.id,
      title: 'New York Natale - Famiglia Conti',
      stage: OpportunityStage.QUALIFICATION,
      probability: 50,
      estimatedValue: 6000,
      currency: 'EUR',
      expectedCloseDate: new Date('2025-09-01'),
      clientId: clientIds[1],
      assignedToId: agentUser.id,
    },
  });
  console.log('   ✓ 2 opportunities');

  // ── FASE 3: Quotations ─────────────────────
  console.log('\n📋 Creating demo quotations...');

  // Quotation 1 — Maldive (ACCEPTED)
  const q1Items = [
    { type: QuotationItemType.FLIGHT, description: 'Volo A/R Roma→Malé, Business Class', quantity: 2, unitPrice: 1800, supplierCost: 1400, sortOrder: 1 },
    { type: QuotationItemType.HOTEL, description: 'Conrad Maldives Rangali Island — 14 notti, Suite Ocean', quantity: 1, unitPrice: 7200, supplierCost: 5400, sortOrder: 2 },
    { type: QuotationItemType.TRANSFER, description: 'Idrovolante Malé → resort A/R per 2 persone', quantity: 1, unitPrice: 600, supplierCost: 420, sortOrder: 3 },
    { type: QuotationItemType.INSURANCE, description: 'Assicurazione viaggio con annullamento', quantity: 2, unitPrice: 120, supplierCost: 80, sortOrder: 4 },
  ];

  const q1Subtotal = q1Items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const q1Cost = q1Items.reduce((s, i) => s + i.supplierCost * i.quantity, 0);
  const q1Total = q1Subtotal;
  const q1Margin = q1Total - q1Cost;

  await prisma.sequenceCounter.upsert({
    where: { tenantId_type_year: { tenantId: tenant.id, type: 'quotation', year: 2025 } },
    create: { tenantId: tenant.id, type: 'quotation', year: 2025, lastValue: 1 },
    update: {},
  });

  const quot1 = await prisma.quotation.create({
    data: {
      tenantId: tenant.id,
      number: 'PRV-2025-0001',
      status: QuotationStatus.ACCEPTED,
      clientId: clientIds[0],
      opportunityId: opp1.id,
      destination: 'Maldive',
      departureDate: new Date('2025-06-15'),
      returnDate: new Date('2025-06-29'),
      numberOfPeople: 2,
      travelType: 'honeymoon',
      currency: 'EUR',
      subtotal: q1Subtotal,
      totalAmount: q1Total,
      totalCost: q1Cost,
      totalMargin: q1Margin,
      marginPercent: parseFloat(((q1Margin / q1Total) * 100).toFixed(2)),
      discountAmount: 0,
      validUntil: new Date('2025-05-15'),
      sentAt: new Date('2025-04-20'),
      acceptedAt: new Date('2025-04-25'),
      clientNotes: 'Preventivo personalizzato per il vostro viaggio di nozze alle Maldive.',
      terms: 'Validità 30 giorni. Prezzi soggetti a disponibilità al momento della conferma.',
      assignedToId: agentUser.id,
      items: {
        create: q1Items.map(i => ({
          tenantId: tenant.id,
          type: i.type,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.unitPrice * i.quantity,
          supplierCost: i.supplierCost,
          totalCost: i.supplierCost * i.quantity,
          marginAmount: (i.unitPrice - i.supplierCost) * i.quantity,
          marginPercent: parseFloat((((i.unitPrice - i.supplierCost) / i.unitPrice) * 100).toFixed(2)),
          sortOrder: i.sortOrder,
        })),
      },
    },
  });

  // Quotation 2 — New York (SENT)
  const q2Items = [
    { type: QuotationItemType.FLIGHT, description: 'Volo A/R Roma→New York JFK, Economy', quantity: 4, unitPrice: 780, supplierCost: 590, sortOrder: 1 },
    { type: QuotationItemType.HOTEL, description: 'Marriott Times Square — 10 notti, Camera Family', quantity: 1, unitPrice: 3200, supplierCost: 2400, sortOrder: 2 },
    { type: QuotationItemType.EXCURSION, description: 'Tour NYC guidato + Staten Island Ferry', quantity: 1, unitPrice: 360, supplierCost: 200, sortOrder: 3 },
    { type: QuotationItemType.INSURANCE, description: 'Assicurazione famiglia con medico', quantity: 4, unitPrice: 85, supplierCost: 55, sortOrder: 4 },
  ];
  const q2Sub = q2Items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const q2Cost = q2Items.reduce((s, i) => s + i.supplierCost * i.quantity, 0);
  const q2Discount = q2Sub * 0.05;
  const q2Total = q2Sub - q2Discount;
  const q2Margin = q2Total - q2Cost;

  const quot2 = await prisma.quotation.create({
    data: {
      tenantId: tenant.id,
      number: 'PRV-2025-0002',
      status: QuotationStatus.SENT,
      clientId: clientIds[1],
      opportunityId: opp2.id,
      destination: 'New York',
      departureDate: new Date('2025-12-20'),
      returnDate: new Date('2025-12-30'),
      numberOfPeople: 4,
      travelType: 'family',
      currency: 'EUR',
      subtotal: q2Sub,
      discountType: 'percentage',
      discountValue: 5,
      discountAmount: q2Discount,
      totalAmount: q2Total,
      totalCost: q2Cost,
      totalMargin: q2Margin,
      marginPercent: parseFloat(((q2Margin / q2Total) * 100).toFixed(2)),
      validUntil: new Date('2025-06-01'),
      sentAt: new Date(),
      clientNotes: 'Preventivo per la vostra vacanza di Natale a New York. Sconto del 5% incluso.',
      assignedToId: agentUser.id,
      items: {
        create: q2Items.map(i => ({
          tenantId: tenant.id,
          type: i.type,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.unitPrice * i.quantity,
          supplierCost: i.supplierCost,
          totalCost: i.supplierCost * i.quantity,
          marginAmount: (i.unitPrice - i.supplierCost) * i.quantity,
          marginPercent: parseFloat((((i.unitPrice - i.supplierCost) / i.unitPrice) * 100).toFixed(2)),
          sortOrder: i.sortOrder,
        })),
      },
    },
  });

  // Quotation 3 — Draft
  await prisma.quotation.create({
    data: {
      tenantId: tenant.id,
      number: 'PRV-2025-0003',
      status: QuotationStatus.DRAFT,
      destination: 'Giappone',
      departureDate: new Date('2025-04-01'),
      returnDate: new Date('2025-04-15'),
      numberOfPeople: 2,
      travelType: 'culture',
      currency: 'EUR',
      subtotal: 0, totalAmount: 0, totalCost: 0,
      totalMargin: 0, marginPercent: 0, discountAmount: 0,
      assignedToId: agentUser.id,
    },
  });

  await prisma.sequenceCounter.update({
    where: { tenantId_type_year: { tenantId: tenant.id, type: 'quotation', year: 2025 } },
    data: { lastValue: 3 },
  });

  console.log('   ✓ 3 quotations (PRV-2025-0001 accepted, PRV-2025-0002 sent, PRV-2025-0003 draft)');

  // Proposal for quot1
  await prisma.proposal.create({
    data: {
      tenantId: tenant.id,
      quotationId: quot1.id,
      title: 'La vostra luna di miele alle Maldive',
      content: `# Benvenuti nella vostra avventura!\n\nAbbiamo il piacere di presentarvi questa proposta esclusiva per il vostro viaggio di nozze alle Maldive.\n\n## Cosa include\n- Voli Business Class\n- 14 notti al Conrad Maldives\n- Trasferimento in idrovolante\n- Assicurazione completa\n\n## Il resort\nIl Conrad Maldives Rangali Island è considerato uno dei migliori resort al mondo...`,
      status: ProposalStatus.ACCEPTED,
      sentAt: new Date('2025-04-20'),
      acceptedAt: new Date('2025-04-25'),
    },
  });
  console.log('   ✓ 1 proposal (accepted)');

  // ── FASE 4: Travel Cases ───────────────────
  console.log('\n🧳 Creating demo travel case...');

  await prisma.sequenceCounter.upsert({
    where: { tenantId_type_year: { tenantId: tenant.id, type: 'case', year: 2025 } },
    create: { tenantId: tenant.id, type: 'case', year: 2025, lastValue: 1 },
    update: {},
  });

  const travelCase = await prisma.travelCase.create({
    data: {
      tenantId: tenant.id,
      number: 'PRA-2025-0001',
      title: 'Viaggio di Nozze Maldive — G. Ferrari & M. Rossi',
      status: CaseStatus.CONFIRMED,
      clientId: clientIds[0],
      quotationId: quot1.id,
      destination: 'Maldive — Conrad Maldives Rangali Island',
      departureDate: new Date('2025-06-15'),
      returnDate: new Date('2025-06-29'),
      numberOfPeople: 2,
      travelType: 'honeymoon',
      currency: 'EUR',
      totalAmount: 11640,
      totalCost: 8620,
      totalPaid: 5820,
      balance: 5820,
      assignedToId: agentUser.id,
      internalNotes: 'Coppia VIP. Richiedono attenzione particolare. Anniversario il 18 Giugno.',
      statusHistory: {
        create: [
          { tenantId: tenant.id, toStatus: CaseStatus.INQUIRY, changedById: agentUser.id, changedAt: new Date('2025-04-15') },
          { tenantId: tenant.id, fromStatus: CaseStatus.INQUIRY, toStatus: CaseStatus.CONFIRMED, changedById: agentUser.id, changedAt: new Date('2025-04-25'), notes: 'Preventivo accettato e acconto ricevuto' },
        ],
      },
    },
  });

  // Passengers
  await prisma.passenger.createMany({
    data: [
      {
        tenantId: tenant.id, caseId: travelCase.id,
        firstName: 'Giuseppe', lastName: 'Ferrari',
        birthDate: new Date('1975-05-20'), nationality: 'IT',
        taxCode: 'FRRPPL75E20H501Z',
        passportNumber: 'AA1234567', passportExpiry: new Date('2031-03-10'), passportIssuedBy: 'Questura di Roma',
        email: 'giuseppe.ferrari@email.it', phone: '+39 347 1111111',
        isLeader: true, mealPreference: 'standard', seatPreference: 'window',
      },
      {
        tenantId: tenant.id, caseId: travelCase.id,
        firstName: 'Maria', lastName: 'Ferrari',
        birthDate: new Date('1978-11-08'), nationality: 'IT',
        taxCode: 'FRRMRA78S48H501Q',
        passportNumber: 'BB9876543', passportExpiry: new Date('2030-07-22'), passportIssuedBy: 'Questura di Roma',
        email: 'maria.ferrari@email.it',
        isLeader: false, mealPreference: 'vegetarian', seatPreference: 'window',
      },
    ],
  });

  // Itinerary
  const itineraryDays = [
    { dayNumber: 1, date: new Date('2025-06-15'), title: 'Partenza da Roma — Arrivo a Malé', description: 'Volo AZ001 da FCO. Arrivo a Malé, transfer in idrovolante al resort.', location: 'Roma → Malé', accommodation: 'Conrad Maldives Rangali Island', dinner: true },
    { dayNumber: 2, date: new Date('2025-06-16'), title: 'Primo giorno al resort', description: 'Giornata di relax. Snorkeling nella laguna privata. Benvenuto con decorazione in camera.', location: 'Conrad Maldives', accommodation: 'Conrad Maldives Rangali Island', breakfast: true, lunch: true, dinner: true },
    { dayNumber: 3, date: new Date('2025-06-17'), title: 'Immersione subacquea', description: 'Escursione guidata di snorkeling e diving. Avvistamento mante e tartarughe.', location: 'Laguna di Rangali', accommodation: 'Conrad Maldives Rangali Island', breakfast: true, dinner: true },
    { dayNumber: 14, date: new Date('2025-06-28'), title: 'Ultimo giorno — Relax e souvenir', description: 'Giornata libera. Cena romantica sulla spiaggia.', location: 'Conrad Maldives', accommodation: 'Conrad Maldives Rangali Island', breakfast: true, lunch: true, dinner: true },
    { dayNumber: 15, date: new Date('2025-06-29'), title: 'Partenza — Rientro a Roma', description: 'Check-out e transfer in idrovolante a Malé. Volo di rientro.', location: 'Malé → Roma', accommodation: '', breakfast: true },
  ];
  await prisma.caseItinerary.createMany({
    data: itineraryDays.map(d => ({ tenantId: tenant.id, caseId: travelCase.id, ...d })),
  });

  // Services
  await prisma.caseService.createMany({
    data: [
      {
        tenantId: tenant.id, caseId: travelCase.id,
        type: CaseServiceType.FLIGHT, description: 'Volo A/R Roma FCO → Malé MLE, Business Class',
        provider: 'ITA Airways', providerRef: 'AZ001-150625',
        status: CaseServiceStatus.CONFIRMED,
        serviceDate: new Date('2025-06-15T10:30:00'), serviceEndDate: new Date('2025-06-15T22:00:00'),
        amount: 3600, cost: 2800, numberOfPax: 2,
      },
      {
        tenantId: tenant.id, caseId: travelCase.id,
        type: CaseServiceType.HOTEL, description: 'Conrad Maldives Rangali Island — 14 notti, Water Bungalow Suite',
        provider: 'Conrad Hotels', providerRef: 'CNR-25-45872',
        status: CaseServiceStatus.CONFIRMED,
        serviceDate: new Date('2025-06-15'), serviceEndDate: new Date('2025-06-29'),
        amount: 7200, cost: 5400, numberOfPax: 2,
        notes: 'Suite romanticamente decorata su richiesta. Upgrade confermato.',
      },
      {
        tenantId: tenant.id, caseId: travelCase.id,
        type: CaseServiceType.TRANSFER, description: 'Idrovolante Malé ↔ Rangali Island A/R per 2 pax',
        provider: 'Trans Maldivian Airways', providerRef: 'TMA-25-0892',
        status: CaseServiceStatus.CONFIRMED,
        serviceDate: new Date('2025-06-15'), amount: 600, cost: 420, numberOfPax: 2,
      },
      {
        tenantId: tenant.id, caseId: travelCase.id,
        type: CaseServiceType.INSURANCE, description: 'Assicurazione viaggio con annullamento e medico',
        provider: 'Allianz Travel', status: CaseServiceStatus.CONFIRMED,
        serviceDate: new Date('2025-06-15'), serviceEndDate: new Date('2025-06-29'),
        amount: 240, cost: 160, numberOfPax: 2,
      },
    ],
  });

  // Complete some checklist items
  const checklists = await prisma.caseChecklist.findMany({ where: { caseId: travelCase.id } });
  if (checklists.length >= 2) {
    await prisma.caseChecklist.update({
      where: { id: checklists[0].id },
      data: { isCompleted: true, completedAt: new Date('2025-04-28'), completedById: agentUser.id },
    });
    await prisma.caseChecklist.update({
      where: { id: checklists[1].id },
      data: { isCompleted: true, completedAt: new Date('2025-04-29'), completedById: agentUser.id },
    });
  }

  await prisma.caseNote.create({
    data: {
      tenantId: tenant.id, caseId: travelCase.id,
      type: NoteType.CALL, content: 'Chiamata con il cliente. Confermati tutti i dettagli. Richiedono decorazione romantica in camera per il 18 Giugno (anniversario).',
      authorId: agentUser.id,
    },
  });

  console.log('   ✓ PRA-2025-0001: 2 passeggeri, 5 giorni itinerario, 4 servizi confermati');

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
