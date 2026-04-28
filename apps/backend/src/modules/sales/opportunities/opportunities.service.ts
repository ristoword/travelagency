import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../../core/audit-log/audit-log.service';
import { getPaginationParams, buildPaginatedResult } from '../../../common/utils/pagination.util';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { AuditAction, OpportunityStage } from '@prisma/client';
import { PartialType } from '@nestjs/swagger';

class UpdateOpportunityDto extends PartialType(CreateOpportunityDto) {}

export interface QueryOpportunitiesDto {
  page?: number; limit?: number; search?: string;
  sortBy?: string; sortOrder?: 'asc' | 'desc';
  stage?: OpportunityStage; assignedToId?: string; clientId?: string;
}

const OPP_SELECT = {
  id: true, tenantId: true, title: true, description: true,
  stage: true, probability: true, estimatedValue: true, currency: true,
  expectedCloseDate: true, lostReason: true, notes: true,
  assignedToId: true, clientId: true, leadId: true,
  createdAt: true, updatedAt: true,
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  client: { select: { id: true, firstName: true, lastName: true, companyName: true } },
  lead: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { quotations: true } },
} as const;

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(tenantId: string, dto: CreateOpportunityDto, createdBy?: string) {
    const opp = await this.prisma.opportunity.create({
      data: { tenantId, ...dto },
      select: OPP_SELECT,
    });

    await this.auditLogService.log({
      tenantId, userId: createdBy, action: AuditAction.CREATE,
      resource: 'opportunities', resourceId: opp.id,
      newValues: { title: opp.title, stage: opp.stage },
    });

    this.logger.log(`Opportunity created: ${opp.title}`);
    return opp;
  }

  async findAll(tenantId: string, query: QueryOpportunitiesDto) {
    const { skip, take, page, limit } = getPaginationParams(query);

    const where = {
      tenantId, deletedAt: null,
      ...(query.stage && { stage: query.stage }),
      ...(query.assignedToId && { assignedToId: query.assignedToId }),
      ...(query.clientId && { clientId: query.clientId }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' as const } },
          { description: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where, skip, take,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        select: OPP_SELECT,
      }),
      this.prisma.opportunity.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async getPipelineStats(tenantId: string) {
    const [byStage, totalValue] = await Promise.all([
      this.prisma.opportunity.groupBy({
        by: ['stage'],
        where: { tenantId, deletedAt: null },
        _count: true,
        _sum: { estimatedValue: true },
      }),
      this.prisma.opportunity.aggregate({
        where: { tenantId, deletedAt: null, stage: { notIn: [OpportunityStage.CLOSED_LOST] } },
        _sum: { estimatedValue: true },
        _avg: { probability: true },
      }),
    ]);

    return { byStage, pipeline: totalValue };
  }

  async findOne(tenantId: string, id: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { ...OPP_SELECT, quotations: { select: { id: true, number: true, status: true, totalAmount: true, createdAt: true } } },
    });
    if (!opp) throw new NotFoundException('Opportunity not found');
    return opp;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateOpportunityDto>, updatedBy?: string) {
    await this.findOne(tenantId, id);
    const updated = await this.prisma.opportunity.update({ where: { id }, data: dto, select: OPP_SELECT });
    await this.auditLogService.log({
      tenantId, userId: updatedBy, action: AuditAction.UPDATE,
      resource: 'opportunities', resourceId: id, newValues: dto,
    });
    return updated;
  }

  async remove(tenantId: string, id: string, deletedBy?: string) {
    await this.findOne(tenantId, id);
    await this.prisma.opportunity.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.auditLogService.log({
      tenantId, userId: deletedBy, action: AuditAction.DELETE, resource: 'opportunities', resourceId: id,
    });
  }
}
