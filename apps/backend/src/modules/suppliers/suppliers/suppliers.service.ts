import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../../core/audit-log/audit-log.service';
import { getPaginationParams, buildPaginatedResult } from '../../../common/utils/pagination.util';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { AuditAction } from '@prisma/client';

const SUPPLIER_SELECT = {
  id: true, tenantId: true, type: true, status: true,
  name: true, legalName: true, code: true, vatNumber: true,
  country: true, address: true, city: true,
  email: true, phone: true, website: true,
  contactPerson: true, contactEmail: true, contactPhone: true,
  defaultCommissionRate: true, paymentTermsDays: true, currency: true,
  qualityScore: true, reliabilityScore: true, priceScore: true, overallScore: true,
  isPreferred: true, internalNotes: true,
  createdAt: true, updatedAt: true,
  _count: { select: { contracts: true, issues: true, contacts: true } },
} as const;

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(tenantId: string, dto: CreateSupplierDto, createdBy?: string) {
    const supplier = await this.prisma.supplier.create({
      data: { tenantId, ...dto },
      select: SUPPLIER_SELECT,
    });

    await this.auditLogService.log({
      tenantId, userId: createdBy, action: AuditAction.CREATE,
      resource: 'suppliers', resourceId: supplier.id,
      newValues: { name: supplier.name, type: supplier.type },
    });

    this.logger.log(`Supplier created: ${supplier.name} (${supplier.type})`);
    return supplier;
  }

  async findAll(tenantId: string, query: QuerySuppliersDto) {
    const { skip, take, page, limit } = getPaginationParams(query);

    const where = {
      tenantId, deletedAt: null,
      ...(query.type && { type: query.type }),
      ...(query.status && { status: query.status }),
      ...(query.isPreferred !== undefined && { isPreferred: query.isPreferred }),
      ...(query.country && { country: query.country }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { legalName: { contains: query.search, mode: 'insensitive' as const } },
          { code: { contains: query.search, mode: 'insensitive' as const } },
          { email: { contains: query.search, mode: 'insensitive' as const } },
          { contactPerson: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where, skip, take,
        orderBy: { [query.sortBy || 'name']: query.sortOrder || 'asc' },
        select: SUPPLIER_SELECT,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async getStats(tenantId: string) {
    const [byType, byStatus, topSuppliers] = await Promise.all([
      this.prisma.supplier.groupBy({
        by: ['type'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      this.prisma.supplier.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      this.prisma.supplier.findMany({
        where: { tenantId, deletedAt: null, isPreferred: true },
        orderBy: { overallScore: 'desc' },
        take: 5,
        select: SUPPLIER_SELECT,
      }),
    ]);

    return { byType, byStatus, topSuppliers };
  }

  async findOne(tenantId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        ...SUPPLIER_SELECT,
        contacts: { orderBy: [{ isPrimary: 'desc' }, { firstName: 'asc' }] },
        contracts: { orderBy: { startDate: 'desc' }, take: 5, select: { id: true, title: true, status: true, startDate: true, endDate: true, commissionRate: true } },
        commissions: { orderBy: { validFrom: 'desc' }, take: 10 },
        issues: { where: { status: { not: 'CLOSED' } }, orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateSupplierDto>, updatedBy?: string) {
    await this.findOne(tenantId, id);
    const updated = await this.prisma.supplier.update({
      where: { id },
      data: dto,
      select: SUPPLIER_SELECT,
    });

    await this.auditLogService.log({
      tenantId, userId: updatedBy, action: AuditAction.UPDATE,
      resource: 'suppliers', resourceId: id,
      newValues: { name: dto.name, status: dto.status },
    });

    return updated;
  }

  async updateScore(tenantId: string, id: string, scores: {
    qualityScore?: number;
    reliabilityScore?: number;
    priceScore?: number;
  }) {
    await this.findOne(tenantId, id);
    const overall = Object.values(scores).filter(Boolean);
    const overallScore = overall.length > 0
      ? parseFloat((overall.reduce((a, b) => a + (b ?? 0), 0) / overall.length).toFixed(1))
      : undefined;

    return this.prisma.supplier.update({
      where: { id },
      data: { ...scores, ...(overallScore !== undefined && { overallScore }) },
      select: SUPPLIER_SELECT,
    });
  }

  async addContact(tenantId: string, supplierId: string, dto: {
    firstName: string; lastName: string; role?: string;
    email?: string; phone?: string; mobile?: string;
    isPrimary?: boolean; notes?: string;
  }) {
    await this.findOne(tenantId, supplierId);
    if (dto.isPrimary) {
      await this.prisma.supplierContact.updateMany({
        where: { supplierId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    return this.prisma.supplierContact.create({ data: { tenantId, supplierId, ...dto } });
  }

  async reportIssue(tenantId: string, supplierId: string, dto: {
    title: string; description: string; priority?: string;
  }, createdBy?: string) {
    await this.findOne(tenantId, supplierId);
    return this.prisma.supplierIssue.create({
      data: { tenantId, supplierId, title: dto.title, description: dto.description, priority: dto.priority as never ?? 'MEDIUM' },
    });
  }

  async remove(tenantId: string, id: string, deletedBy?: string) {
    await this.findOne(tenantId, id);
    await this.prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.auditLogService.log({
      tenantId, userId: deletedBy, action: AuditAction.DELETE, resource: 'suppliers', resourceId: id,
    });
  }
}
