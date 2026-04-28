import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../../core/audit-log/audit-log.service';
import {
  getPaginationParams,
  buildPaginatedResult,
} from '../../../common/utils/pagination.util';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
import { AuditAction, HistoryEventType } from '@prisma/client';

const CLIENT_SELECT = {
  id: true,
  tenantId: true,
  type: true,
  status: true,
  source: true,
  firstName: true,
  lastName: true,
  companyName: true,
  taxCode: true,
  vatNumber: true,
  birthDate: true,
  email: true,
  phone: true,
  mobile: true,
  website: true,
  address: true,
  city: true,
  province: true,
  postalCode: true,
  country: true,
  preferredLanguage: true,
  preferredCurrency: true,
  isVip: true,
  isNewsletterSubscribed: true,
  totalBookings: true,
  totalSpent: true,
  lastBookingDate: true,
  internalNotes: true,
  assignedToId: true,
  createdAt: true,
  updatedAt: true,
  assignedTo: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  tags: {
    include: { tag: { select: { id: true, name: true, color: true } } },
  },
  _count: { select: { contacts: true, notes: true, leads: true } },
} as const;

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(tenantId: string, dto: CreateClientDto, createdBy?: string) {
    if (dto.email) {
      const existing = await this.prisma.client.findFirst({
        where: { tenantId, email: dto.email.toLowerCase(), deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(
          `A client with email "${dto.email}" already exists`,
        );
      }
    }

    const { tagIds, ...clientData } = dto;

    const client = await this.prisma.client.create({
      data: {
        tenantId,
        ...clientData,
        email: dto.email ? dto.email.toLowerCase() : undefined,
        ...(tagIds?.length && {
          tags: {
            create: tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
      select: CLIENT_SELECT,
    });

    // Log history event
    await this.prisma.customerHistory.create({
      data: {
        tenantId,
        clientId: client.id,
        eventType: HistoryEventType.CLIENT_CREATED,
        title: 'Cliente creato',
        description: `Cliente ${this.getClientName(client)} aggiunto al CRM`,
        metadata: { source: dto.source, createdBy },
      },
    });

    await this.auditLogService.log({
      tenantId,
      userId: createdBy,
      action: AuditAction.CREATE,
      resource: 'clients',
      resourceId: client.id,
      newValues: { email: client.email, firstName: client.firstName, lastName: client.lastName },
    });

    this.logger.log(`Client created: ${this.getClientName(client)} (tenant: ${tenantId})`);
    return client;
  }

  async findAll(tenantId: string, query: QueryClientsDto) {
    const { skip, take, page, limit } = getPaginationParams(query);

    const where = {
      tenantId,
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.type && { type: query.type }),
      ...(query.source && { source: query.source }),
      ...(query.isVip !== undefined && { isVip: query.isVip }),
      ...(query.assignedToId && { assignedToId: query.assignedToId }),
      ...(query.city && { city: { contains: query.city, mode: 'insensitive' as const } }),
      ...(query.tagId && { tags: { some: { tagId: query.tagId } } }),
      ...(query.search && {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' as const } },
          { lastName: { contains: query.search, mode: 'insensitive' as const } },
          { companyName: { contains: query.search, mode: 'insensitive' as const } },
          { email: { contains: query.search, mode: 'insensitive' as const } },
          { phone: { contains: query.search, mode: 'insensitive' as const } },
          { mobile: { contains: query.search, mode: 'insensitive' as const } },
          { taxCode: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        select: CLIENT_SELECT,
      }),
      this.prisma.client.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        ...CLIENT_SELECT,
        contacts: {
          where: { deletedAt: null },
          orderBy: [{ isPrimary: 'desc' }, { firstName: 'asc' }],
        },
        preferences: { orderBy: { key: 'asc' } },
      },
    });

    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async update(tenantId: string, id: string, dto: UpdateClientDto, updatedBy?: string) {
    const client = await this.findOne(tenantId, id);

    if (dto.email && dto.email !== client.email) {
      const existing = await this.prisma.client.findFirst({
        where: { tenantId, email: dto.email.toLowerCase(), deletedAt: null, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Email "${dto.email}" already used by another client`);
      }
    }

    const { tagIds, ...updateData } = dto;

    const updated = await this.prisma.client.update({
      where: { id },
      data: {
        ...updateData,
        email: dto.email ? dto.email.toLowerCase() : undefined,
        ...(tagIds !== undefined && {
          tags: {
            deleteMany: {},
            create: tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
      select: CLIENT_SELECT,
    });

    await this.auditLogService.log({
      tenantId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      resource: 'clients',
      resourceId: id,
      oldValues: { status: client.status, email: client.email },
      newValues: dto,
    });

    return updated;
  }

  async remove(tenantId: string, id: string, deletedBy?: string) {
    await this.findOne(tenantId, id);

    await this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditLogService.log({
      tenantId,
      userId: deletedBy,
      action: AuditAction.DELETE,
      resource: 'clients',
      resourceId: id,
    });
  }

  async getStats(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    const [notes, leads] = await Promise.all([
      this.prisma.customerNote.count({ where: { clientId: id } }),
      this.prisma.lead.count({ where: { clientId: id, deletedAt: null } }),
    ]);

    const client = await this.prisma.client.findUnique({
      where: { id },
      select: { totalBookings: true, totalSpent: true, lastBookingDate: true },
    });

    return { ...client, totalNotes: notes, totalLeads: leads };
  }

  // Notes
  async getNotes(tenantId: string, clientId: string) {
    await this.findOne(tenantId, clientId);
    return this.prisma.customerNote.findMany({
      where: { clientId, tenantId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addNote(
    tenantId: string,
    clientId: string,
    content: string,
    type = 'GENERAL',
    isPrivate = false,
    authorId?: string,
  ) {
    await this.findOne(tenantId, clientId);

    const note = await this.prisma.customerNote.create({
      data: {
        tenantId,
        clientId,
        content,
        type: type as never,
        isPrivate,
        authorId,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.prisma.customerHistory.create({
      data: {
        tenantId,
        clientId,
        eventType: HistoryEventType.NOTE_ADDED,
        title: 'Nota aggiunta',
        description: content.slice(0, 100),
        referenceId: note.id,
        referenceType: 'CustomerNote',
      },
    });

    return note;
  }

  // Tags
  async addTag(tenantId: string, clientId: string, tagId: string) {
    await this.findOne(tenantId, clientId);
    const tag = await this.prisma.tag.findFirst({ where: { id: tagId, tenantId } });
    if (!tag) throw new NotFoundException('Tag not found');

    return this.prisma.clientTag.upsert({
      where: { clientId_tagId: { clientId, tagId } },
      create: { clientId, tagId },
      update: {},
    });
  }

  async removeTag(tenantId: string, clientId: string, tagId: string) {
    await this.findOne(tenantId, clientId);
    await this.prisma.clientTag.delete({
      where: { clientId_tagId: { clientId, tagId } },
    });
  }

  private getClientName(client: { firstName?: string | null; lastName?: string | null; companyName?: string | null }): string {
    if (client.firstName || client.lastName) {
      return `${client.firstName || ''} ${client.lastName || ''}`.trim();
    }
    return client.companyName || 'Unknown';
  }
}
