import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../../core/audit-log/audit-log.service';
import { getPaginationParams, buildPaginatedResult } from '../../../common/utils/pagination.util';
import { CreateQuotationDto, CreateQuotationItemDto } from './dto/create-quotation.dto';
import { QueryQuotationsDto } from './dto/query-quotations.dto';
import { AuditAction, QuotationStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const QUOTATION_SELECT = {
  id: true, tenantId: true, number: true, status: true,
  clientId: true, leadId: true, opportunityId: true,
  destination: true, departureDate: true, returnDate: true,
  numberOfPeople: true, travelType: true, currency: true,
  subtotal: true, discountType: true, discountValue: true,
  discountAmount: true, totalAmount: true, totalCost: true,
  totalMargin: true, marginPercent: true,
  validUntil: true, sentAt: true, viewedAt: true,
  acceptedAt: true, rejectedAt: true,
  clientNotes: true, internalNotes: true, terms: true,
  assignedToId: true, createdAt: true, updatedAt: true,
  client: { select: { id: true, firstName: true, lastName: true, companyName: true, email: true } },
  lead: { select: { id: true, firstName: true, lastName: true, email: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  items: { orderBy: { sortOrder: 'asc' as const } },
  _count: { select: { items: true } },
} as const;

@Injectable()
export class QuotationsService {
  private readonly logger = new Logger(QuotationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ── Auto-numbering ──────────────────────────────────────
  private async generateNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'PRV';

    const counter = await this.prisma.sequenceCounter.upsert({
      where: { tenantId_type_year: { tenantId, type: 'quotation', year } },
      create: { tenantId, type: 'quotation', year, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });

    return `${prefix}-${year}-${String(counter.lastValue).padStart(4, '0')}`;
  }

  // ── Financials calculation ──────────────────────────────
  private calculateFinancials(
    items: CreateQuotationItemDto[],
    discountType?: string,
    discountValue?: number,
  ) {
    const subtotal = items.reduce((sum, item) => {
      return sum + item.unitPrice * item.quantity;
    }, 0);

    const totalCost = items.reduce((sum, item) => {
      return sum + (item.supplierCost ?? 0) * item.quantity;
    }, 0);

    let discountAmount = 0;
    if (discountValue && discountValue > 0) {
      if (discountType === 'percentage') {
        discountAmount = (subtotal * discountValue) / 100;
      } else if (discountType === 'fixed') {
        discountAmount = discountValue;
      }
    }

    const totalAmount = subtotal - discountAmount;
    const totalMargin = totalAmount - totalCost;
    const marginPercent = totalAmount > 0 ? (totalMargin / totalAmount) * 100 : 0;

    return {
      subtotal,
      discountAmount,
      totalAmount,
      totalCost,
      totalMargin,
      marginPercent: parseFloat(marginPercent.toFixed(2)),
    };
  }

  private buildItemData(item: CreateQuotationItemDto, tenantId: string) {
    const totalPrice = item.unitPrice * item.quantity;
    const totalCost = (item.supplierCost ?? 0) * item.quantity;
    const marginAmount = totalPrice - totalCost;
    const marginPercent = totalPrice > 0 ? (marginAmount / totalPrice) * 100 : 0;

    return {
      tenantId,
      type: item.type,
      description: item.description,
      details: item.details,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice,
      supplierCost: item.supplierCost ?? 0,
      totalCost,
      marginAmount,
      marginPercent: parseFloat(marginPercent.toFixed(2)),
      supplierRef: item.supplierRef,
      notes: item.notes,
      sortOrder: item.sortOrder ?? 0,
    };
  }

  // ── CRUD ────────────────────────────────────────────────
  async create(tenantId: string, dto: CreateQuotationDto, createdBy?: string) {
    const number = await this.generateNumber(tenantId);
    const items = dto.items ?? [];
    const financials = this.calculateFinancials(items, dto.discountType, dto.discountValue);

    const quotation = await this.prisma.quotation.create({
      data: {
        tenantId, number,
        clientId: dto.clientId,
        leadId: dto.leadId,
        opportunityId: dto.opportunityId,
        destination: dto.destination,
        departureDate: dto.departureDate ? new Date(dto.departureDate) : undefined,
        returnDate: dto.returnDate ? new Date(dto.returnDate) : undefined,
        numberOfPeople: dto.numberOfPeople,
        travelType: dto.travelType,
        currency: dto.currency ?? 'EUR',
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        clientNotes: dto.clientNotes,
        internalNotes: dto.internalNotes,
        terms: dto.terms,
        assignedToId: dto.assignedToId,
        ...financials,
        items: items.length > 0 ? {
          create: items.map(item => this.buildItemData(item, tenantId)),
        } : undefined,
      },
      select: QUOTATION_SELECT,
    });

    await this.auditLogService.log({
      tenantId, userId: createdBy, action: AuditAction.CREATE,
      resource: 'quotations', resourceId: quotation.id,
      newValues: { number: quotation.number, totalAmount: quotation.totalAmount },
    });

    this.logger.log(`Quotation created: ${number} (${financials.totalAmount}€)`);
    return quotation;
  }

  async findAll(tenantId: string, query: QueryQuotationsDto) {
    const { skip, take, page, limit } = getPaginationParams(query);

    const where = {
      tenantId, deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.clientId && { clientId: query.clientId }),
      ...(query.leadId && { leadId: query.leadId }),
      ...(query.assignedToId && { assignedToId: query.assignedToId }),
      ...(query.destination && { destination: { contains: query.destination, mode: 'insensitive' as const } }),
      ...(query.search && {
        OR: [
          { number: { contains: query.search, mode: 'insensitive' as const } },
          { destination: { contains: query.search, mode: 'insensitive' as const } },
          { client: { OR: [
            { firstName: { contains: query.search, mode: 'insensitive' as const } },
            { lastName: { contains: query.search, mode: 'insensitive' as const } },
          ]}},
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where, skip, take,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        select: QUOTATION_SELECT,
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async getStats(tenantId: string) {
    const [byStatus, totals, topDestinations] = await Promise.all([
      this.prisma.quotation.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.quotation.aggregate({
        where: { tenantId, deletedAt: null },
        _sum: { totalAmount: true, totalMargin: true, totalCost: true },
        _avg: { marginPercent: true },
        _count: true,
      }),
      this.prisma.quotation.groupBy({
        by: ['destination'],
        where: { tenantId, deletedAt: null, destination: { not: null } },
        _count: true,
        _sum: { totalAmount: true },
        orderBy: { _count: { destination: 'desc' } },
        take: 5,
      }),
    ]);

    const accepted = byStatus.find(s => s.status === QuotationStatus.ACCEPTED)?._count ?? 0;
    const total = totals._count;
    const conversionRate = total > 0 ? ((accepted / total) * 100).toFixed(1) : '0.0';

    return { byStatus, totals, topDestinations, conversionRate };
  }

  async findOne(tenantId: string, id: string) {
    const q = await this.prisma.quotation.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { ...QUOTATION_SELECT, proposal: { select: { id: true, title: true, status: true } } },
    });
    if (!q) throw new NotFoundException('Quotation not found');
    return q;
  }

  async findByNumber(tenantId: string, number: string) {
    const q = await this.prisma.quotation.findFirst({
      where: { number, tenantId, deletedAt: null },
      select: QUOTATION_SELECT,
    });
    if (!q) throw new NotFoundException('Quotation not found');
    return q;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateQuotationDto>, updatedBy?: string) {
    const existing = await this.findOne(tenantId, id);

    if ([QuotationStatus.ACCEPTED, QuotationStatus.CONVERTED].includes(existing.status as QuotationStatus)) {
      throw new BadRequestException('Cannot edit an accepted or converted quotation');
    }

    const items = dto.items ?? existing.items as unknown as CreateQuotationItemDto[];
    const financials = this.calculateFinancials(
      items,
      dto.discountType ?? existing.discountType ?? undefined,
      dto.discountValue !== undefined ? dto.discountValue : (existing.discountValue as unknown as number | undefined),
    );

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        ...dto,
        departureDate: dto.departureDate ? new Date(dto.departureDate) : undefined,
        returnDate: dto.returnDate ? new Date(dto.returnDate) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        ...financials,
        ...(dto.items !== undefined && {
          items: {
            deleteMany: {},
            create: dto.items.map(item => this.buildItemData(item, tenantId)),
          },
        }),
      },
      select: QUOTATION_SELECT,
    });

    await this.auditLogService.log({
      tenantId, userId: updatedBy, action: AuditAction.UPDATE,
      resource: 'quotations', resourceId: id,
      oldValues: { status: existing.status }, newValues: dto,
    });

    return updated;
  }

  async updateStatus(tenantId: string, id: string, status: QuotationStatus, userId?: string) {
    const q = await this.findOne(tenantId, id);

    const timestamps: Record<string, Date> = {};
    if (status === QuotationStatus.SENT && !q.sentAt) timestamps.sentAt = new Date();
    if (status === QuotationStatus.VIEWED && !q.viewedAt) timestamps.viewedAt = new Date();
    if (status === QuotationStatus.ACCEPTED) timestamps.acceptedAt = new Date();
    if (status === QuotationStatus.REJECTED) timestamps.rejectedAt = new Date();

    return this.prisma.quotation.update({
      where: { id },
      data: { status, ...timestamps },
      select: QUOTATION_SELECT,
    });
  }

  async addItem(tenantId: string, quotationId: string, item: CreateQuotationItemDto, userId?: string) {
    const q = await this.findOne(tenantId, quotationId);
    if ([QuotationStatus.ACCEPTED, QuotationStatus.CONVERTED].includes(q.status as QuotationStatus)) {
      throw new BadRequestException('Cannot add items to an accepted quotation');
    }

    await this.prisma.quotationItem.create({
      data: { quotationId, ...this.buildItemData(item, tenantId) },
    });

    return this.recalculate(tenantId, quotationId);
  }

  async removeItem(tenantId: string, quotationId: string, itemId: string) {
    await this.findOne(tenantId, quotationId);
    await this.prisma.quotationItem.delete({ where: { id: itemId } });
    return this.recalculate(tenantId, quotationId);
  }

  private async recalculate(tenantId: string, quotationId: string) {
    const q = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { items: true },
    });
    if (!q) throw new NotFoundException('Quotation not found');

    const itemDtos = q.items.map(i => ({
      type: i.type,
      description: i.description,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      supplierCost: Number(i.supplierCost),
    } as CreateQuotationItemDto));

    const financials = this.calculateFinancials(
      itemDtos,
      q.discountType ?? undefined,
      q.discountValue ? Number(q.discountValue) : undefined,
    );

    return this.prisma.quotation.update({
      where: { id: quotationId },
      data: financials,
      select: QUOTATION_SELECT,
    });
  }

  async remove(tenantId: string, id: string, deletedBy?: string) {
    await this.findOne(tenantId, id);
    await this.prisma.quotation.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.auditLogService.log({
      tenantId, userId: deletedBy, action: AuditAction.DELETE,
      resource: 'quotations', resourceId: id,
    });
  }
}
