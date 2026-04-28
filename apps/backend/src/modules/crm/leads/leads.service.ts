import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../../core/audit-log/audit-log.service';
import {
  getPaginationParams,
  buildPaginatedResult,
} from '../../../common/utils/pagination.util';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { AuditAction, HistoryEventType, LeadStatus, ClientSource, NoteType } from '@prisma/client';

const LEAD_SELECT = {
  id: true,
  tenantId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  mobile: true,
  status: true,
  priority: true,
  source: true,
  score: true,
  destination: true,
  departureDate: true,
  returnDate: true,
  numberOfPeople: true,
  budget: true,
  budgetCurrency: true,
  travelType: true,
  description: true,
  assignedToId: true,
  clientId: true,
  convertedAt: true,
  lostReason: true,
  createdAt: true,
  updatedAt: true,
  assignedTo: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  client: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  tags: {
    include: { tag: { select: { id: true, name: true, color: true } } },
  },
  _count: { select: { notes: true } },
} as const;

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(tenantId: string, dto: CreateLeadDto, createdBy?: string) {
    const { tagIds, ...leadData } = dto;

    const lead = await this.prisma.lead.create({
      data: {
        tenantId,
        ...leadData,
        email: dto.email ? dto.email.toLowerCase() : undefined,
        ...(tagIds?.length && {
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        }),
      },
      select: LEAD_SELECT,
    });

    await this.prisma.customerHistory.create({
      data: {
        tenantId,
        leadId: lead.id,
        eventType: HistoryEventType.LEAD_CREATED,
        title: 'Lead acquisito',
        description: `${lead.firstName} ${lead.lastName} — ${lead.destination || 'destinazione non specificata'}`,
        metadata: { source: dto.source, createdBy },
      },
    });

    await this.auditLogService.log({
      tenantId,
      userId: createdBy,
      action: AuditAction.CREATE,
      resource: 'leads',
      resourceId: lead.id,
      newValues: { firstName: lead.firstName, lastName: lead.lastName, status: lead.status },
    });

    this.logger.log(`Lead created: ${lead.firstName} ${lead.lastName} (tenant: ${tenantId})`);
    return lead;
  }

  async findAll(tenantId: string, query: QueryLeadsDto) {
    const { skip, take, page, limit } = getPaginationParams(query);

    const where = {
      tenantId,
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
      ...(query.source && { source: query.source }),
      ...(query.assignedToId && { assignedToId: query.assignedToId }),
      ...(query.destination && {
        destination: { contains: query.destination, mode: 'insensitive' as const },
      }),
      ...(query.tagId && { tags: { some: { tagId: query.tagId } } }),
      ...(query.search && {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' as const } },
          { lastName: { contains: query.search, mode: 'insensitive' as const } },
          { email: { contains: query.search, mode: 'insensitive' as const } },
          { phone: { contains: query.search, mode: 'insensitive' as const } },
          { destination: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        select: LEAD_SELECT,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async getPipelineStats(tenantId: string) {
    const [byStatus, bySource, byPriority, recentLeads, conversionRate] =
      await Promise.all([
        this.prisma.lead.groupBy({
          by: ['status'],
          where: { tenantId, deletedAt: null },
          _count: true,
        }),
        this.prisma.lead.groupBy({
          by: ['source'],
          where: { tenantId, deletedAt: null },
          _count: true,
          orderBy: { _count: { source: 'desc' } },
        }),
        this.prisma.lead.groupBy({
          by: ['priority'],
          where: { tenantId, deletedAt: null },
          _count: true,
        }),
        this.prisma.lead.findMany({
          where: { tenantId, deletedAt: null },
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: LEAD_SELECT,
        }),
        this.prisma.lead.count({
          where: { tenantId, status: LeadStatus.WON },
        }),
      ]);

    const total = await this.prisma.lead.count({ where: { tenantId, deletedAt: null } });
    const won = byStatus.find((s) => s.status === LeadStatus.WON)?._count ?? 0;
    const avgBudget = await this.prisma.lead.aggregate({
      where: { tenantId, deletedAt: null, budget: { not: null } },
      _avg: { budget: true },
    });

    return {
      byStatus,
      bySource,
      byPriority,
      recentLeads,
      total,
      conversionRate: total > 0 ? ((won / total) * 100).toFixed(1) : '0.0',
      avgBudget: avgBudget._avg.budget,
    };
  }

  async findOne(tenantId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: LEAD_SELECT,
    });

    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto, updatedBy?: string) {
    const lead = await this.findOne(tenantId, id);
    const { tagIds, ...updateData } = dto;

    if (lead.status === LeadStatus.WON && dto.status && dto.status !== LeadStatus.WON) {
      throw new BadRequestException('Cannot change status of a converted lead');
    }

    const updated = await this.prisma.lead.update({
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
      select: LEAD_SELECT,
    });

    if (dto.status && dto.status !== lead.status) {
      await this.prisma.customerHistory.create({
        data: {
          tenantId,
          leadId: id,
          eventType: HistoryEventType.OTHER,
          title: `Stato cambiato: ${lead.status} → ${dto.status}`,
          description: dto.lostReason || undefined,
        },
      });
    }

    await this.auditLogService.log({
      tenantId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      resource: 'leads',
      resourceId: id,
      oldValues: { status: lead.status, priority: lead.priority },
      newValues: { ...dto },
    });

    return updated;
  }

  async convert(tenantId: string, leadId: string, dto: ConvertLeadDto, convertedBy?: string) {
    const lead = await this.findOne(tenantId, leadId);

    if (lead.status === LeadStatus.WON) {
      throw new BadRequestException('Lead is already converted');
    }

    let clientId = dto.existingClientId;

    if (!clientId) {
      // Create new client from lead data
      const newClient = await this.prisma.client.create({
        data: {
          tenantId,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          mobile: lead.mobile || undefined,
          source: ClientSource.OTHER,
          assignedToId: lead.assignedToId || undefined,
        },
      });
      clientId = newClient.id;

      await this.prisma.customerHistory.create({
        data: {
          tenantId,
          clientId: newClient.id,
          eventType: HistoryEventType.CLIENT_CREATED,
          title: 'Cliente creato da lead',
          referenceId: leadId,
          referenceType: 'Lead',
        },
      });
    }

    const updatedLead = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        status: LeadStatus.WON,
        clientId,
        convertedAt: new Date(),
      },
      select: LEAD_SELECT,
    });

    await this.prisma.customerHistory.create({
      data: {
        tenantId,
        leadId,
        clientId,
        eventType: HistoryEventType.LEAD_CONVERTED,
        title: 'Lead convertito in cliente',
        description: dto.notes || undefined,
        metadata: { convertedBy, existingClientId: dto.existingClientId },
      },
    });

    if (dto.notes) {
      await this.prisma.customerNote.create({
        data: {
          tenantId,
          leadId,
          clientId,
          type: NoteType.GENERAL,
          content: dto.notes,
          authorId: convertedBy,
        },
      });
    }

    await this.auditLogService.log({
      tenantId,
      userId: convertedBy,
      action: AuditAction.UPDATE,
      resource: 'leads',
      resourceId: leadId,
      oldValues: { status: lead.status },
      newValues: { status: LeadStatus.WON, clientId },
    });

    return { lead: updatedLead, clientId };
  }

  async remove(tenantId: string, id: string, deletedBy?: string) {
    await this.findOne(tenantId, id);

    await this.prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditLogService.log({
      tenantId,
      userId: deletedBy,
      action: AuditAction.DELETE,
      resource: 'leads',
      resourceId: id,
    });
  }

  // Notes
  async getNotes(tenantId: string, leadId: string) {
    await this.findOne(tenantId, leadId);
    return this.prisma.customerNote.findMany({
      where: { leadId, tenantId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addNote(
    tenantId: string,
    leadId: string,
    content: string,
    type: NoteType = NoteType.GENERAL,
    isPrivate = false,
    authorId?: string,
  ) {
    await this.findOne(tenantId, leadId);

    return this.prisma.customerNote.create({
      data: { tenantId, leadId, content, type, isPrivate, authorId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async addTag(tenantId: string, leadId: string, tagId: string) {
    await this.findOne(tenantId, leadId);
    const tag = await this.prisma.tag.findFirst({ where: { id: tagId, tenantId } });
    if (!tag) throw new NotFoundException('Tag not found');

    return this.prisma.leadTag.upsert({
      where: { leadId_tagId: { leadId, tagId } },
      create: { leadId, tagId },
      update: {},
    });
  }

  async removeTag(tenantId: string, leadId: string, tagId: string) {
    await this.findOne(tenantId, leadId);
    await this.prisma.leadTag.delete({ where: { leadId_tagId: { leadId, tagId } } });
  }
}
