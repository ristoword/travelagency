import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { HistoryEventType } from '@prisma/client';
import { getPaginationParams, buildPaginatedResult } from '../../../common/utils/pagination.util';

export interface CreateHistoryEventDto {
  clientId?: string;
  leadId?: string;
  eventType: HistoryEventType;
  title: string;
  description?: string;
  referenceId?: string;
  referenceType?: string;
  metadata?: Record<string, unknown>;
  eventDate?: Date;
}

export interface QueryHistoryDto {
  page?: number;
  limit?: number;
  eventType?: HistoryEventType;
  from?: string;
  to?: string;
}

@Injectable()
export class CustomerHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findByClient(tenantId: string, clientId: string, query: QueryHistoryDto) {
    const client = await this.prisma.client.findFirst({ where: { id: clientId, tenantId, deletedAt: null } });
    if (!client) throw new NotFoundException('Client not found');

    const { skip, take, page, limit } = getPaginationParams(query);

    const where = {
      clientId,
      tenantId,
      ...(query.eventType && { eventType: query.eventType }),
      ...((query.from || query.to) && {
        eventDate: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to) }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.customerHistory.findMany({
        where,
        skip,
        take,
        orderBy: { eventDate: 'desc' },
      }),
      this.prisma.customerHistory.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findByLead(tenantId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, tenantId, deletedAt: null } });
    if (!lead) throw new NotFoundException('Lead not found');

    return this.prisma.customerHistory.findMany({
      where: { leadId, tenantId },
      orderBy: { eventDate: 'desc' },
    });
  }

  async create(tenantId: string, dto: CreateHistoryEventDto) {
    return this.prisma.customerHistory.create({
      data: {
        tenantId,
        ...dto,
        metadata: dto.metadata as never,
      },
    });
  }
}
