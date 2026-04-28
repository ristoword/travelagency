import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  getPaginationParams,
  buildPaginatedResult,
} from '../../common/utils/pagination.util';
import { AuditAction } from '@prisma/client';

export interface CreateAuditLogDto {
  tenantId: string;
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  userId?: string;
  resource?: string;
  action?: AuditAction;
  resourceId?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data: dto });
    } catch (error) {
      this.logger.error('Failed to write audit log', error);
    }
  }

  async findAll(tenantId: string, query: AuditLogQuery) {
    const { skip, take, page, limit } = getPaginationParams(query);

    const where = {
      tenantId,
      ...(query.userId && { userId: query.userId }),
      ...(query.resource && { resource: query.resource }),
      ...(query.action && { action: query.action }),
      ...(query.resourceId && { resourceId: query.resourceId }),
      ...((query.from || query.to) && {
        createdAt: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to) }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    return this.prisma.auditLog.findFirst({
      where: { id, tenantId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async getStats(tenantId: string) {
    const [total, byAction, byResource, recentLogins] = await Promise.all([
      this.prisma.auditLog.count({ where: { tenantId } }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { tenantId },
        _count: true,
        orderBy: { _count: { action: 'desc' } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['resource'],
        where: { tenantId },
        _count: true,
        orderBy: { _count: { resource: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.findMany({
        where: { tenantId, action: AuditAction.LOGIN },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
    ]);

    return { total, byAction, byResource, recentLogins };
  }
}
