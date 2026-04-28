import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../../core/audit-log/audit-log.service';
import { getPaginationParams, buildPaginatedResult } from '../../../common/utils/pagination.util';
import { CreateInvoiceDto, CreateInvoiceItemDto } from './dto/create-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { AuditAction, InvoiceStatus, InvoiceType } from '@prisma/client';

const INV_SELECT = {
  id: true, tenantId: true, number: true, type: true, status: true,
  clientId: true, caseId: true, bookingId: true,
  issuedAt: true, dueDate: true, sentAt: true, paidAt: true,
  currency: true, subtotal: true, discountAmount: true,
  vatRate: true, vatAmount: true, totalAmount: true,
  paidAmount: true, balanceDue: true,
  clientName: true, clientAddress: true, clientVat: true, clientTaxCode: true,
  notes: true, paymentTerms: true,
  createdAt: true, updatedAt: true,
  client: { select: { id: true, firstName: true, lastName: true, companyName: true, email: true, vatNumber: true, taxCode: true, address: true, city: true } },
  case: { select: { id: true, number: true, title: true, destination: true } },
  items: { orderBy: { sortOrder: 'asc' as const } },
  _count: { select: { payments: true, creditNotes: true } },
} as const;

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async generateNumber(tenantId: string, type: InvoiceType): Promise<string> {
    const year = new Date().getFullYear();
    const prefixMap: Record<InvoiceType, string> = {
      INVOICE: 'FT',
      PROFORMA: 'PRF',
      RECEIPT: 'RC',
    };
    const prefix = prefixMap[type];
    const counter = await this.prisma.sequenceCounter.upsert({
      where: { tenantId_type_year: { tenantId, type: `invoice_${type.toLowerCase()}`, year } },
      create: { tenantId, type: `invoice_${type.toLowerCase()}`, year, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });
    return `${prefix}-${year}-${String(counter.lastValue).padStart(4, '0')}`;
  }

  private buildItemData(item: CreateInvoiceItemDto, defaultVatRate: number, tenantId: string) {
    const amount = parseFloat((item.quantity * item.unitPrice).toFixed(2));
    const vatRate = item.vatRate ?? defaultVatRate;
    const vatAmount = parseFloat((amount * vatRate / 100).toFixed(2));
    const total = parseFloat((amount + vatAmount).toFixed(2));
    return { tenantId, description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, amount, vatRate, vatAmount, total, sortOrder: item.sortOrder ?? 0 };
  }

  private calcFinancials(items: Array<{ amount: number; vatRate: number; unitPrice: number; quantity: number }>, vatRate: number, discountAmount = 0) {
    const subtotal = parseFloat(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toFixed(2));
    const subtotalAfterDiscount = parseFloat((subtotal - discountAmount).toFixed(2));
    const vatAmount = parseFloat((subtotalAfterDiscount * vatRate / 100).toFixed(2));
    const totalAmount = parseFloat((subtotalAfterDiscount + vatAmount).toFixed(2));
    return { subtotal, vatAmount, totalAmount, balanceDue: totalAmount };
  }

  async create(tenantId: string, dto: CreateInvoiceDto, createdBy?: string) {
    const type = dto.type ?? InvoiceType.INVOICE;
    const number = await this.generateNumber(tenantId, type);
    const vatRate = dto.vatRate ?? 22;
    const discountAmount = dto.discountAmount ?? 0;
    const items = dto.items ?? [];

    const financials = this.calcFinancials(items, vatRate, discountAmount);

    // Snapshot client data
    let clientSnapshot = {};
    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, tenantId },
        select: { firstName: true, lastName: true, companyName: true, address: true, city: true, vatNumber: true, taxCode: true },
      });
      if (client) {
        const name = client.companyName ?? `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim();
        clientSnapshot = {
          clientName: name,
          clientAddress: [client.address, client.city].filter(Boolean).join(', '),
          clientVat: client.vatNumber,
          clientTaxCode: client.taxCode,
        };
      }
    }

    // Snapshot tenant data
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, vatNumber: true } });

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId, number, type, status: InvoiceStatus.DRAFT,
        clientId: dto.clientId, caseId: dto.caseId, bookingId: dto.bookingId,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        currency: dto.currency ?? 'EUR',
        vatRate, discountAmount,
        notes: dto.notes, internalNotes: dto.internalNotes, paymentTerms: dto.paymentTerms,
        tenantName: tenant?.name, tenantVat: tenant?.vatNumber,
        ...clientSnapshot,
        ...financials,
        items: items.length > 0 ? {
          create: items.map(i => this.buildItemData(i, vatRate, tenantId)),
        } : undefined,
      },
      select: INV_SELECT,
    });

    await this.auditLogService.log({
      tenantId, userId: createdBy, action: AuditAction.CREATE,
      resource: 'invoices', resourceId: invoice.id,
      newValues: { number: invoice.number, totalAmount: invoice.totalAmount },
    });

    this.logger.log(`Invoice created: ${number} — ${financials.totalAmount}€`);
    return invoice;
  }

  async findAll(tenantId: string, query: QueryInvoicesDto) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const now = new Date();

    const where = {
      tenantId, deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.type && { type: query.type }),
      ...(query.clientId && { clientId: query.clientId }),
      ...(query.caseId && { caseId: query.caseId }),
      ...(query.overdue === 'true' && {
        status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID] },
        dueDate: { lt: now },
      }),
      ...((query.from || query.to) && {
        issuedAt: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to) }),
        },
      }),
      ...(query.search && {
        OR: [
          { number: { contains: query.search, mode: 'insensitive' as const } },
          { clientName: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where, skip, take,
        orderBy: { [query.sortBy || 'issuedAt']: query.sortOrder || 'desc' },
        select: INV_SELECT,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async getStats(tenantId: string) {
    const now = new Date();
    const [byStatus, totals, overdue, monthly] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
        _sum: { totalAmount: true, balanceDue: true },
      }),
      this.prisma.invoice.aggregate({
        where: { tenantId, deletedAt: null },
        _sum: { totalAmount: true, paidAmount: true, balanceDue: true, vatAmount: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: {
          tenantId, deletedAt: null,
          status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID] },
          dueDate: { lt: now },
        },
        _sum: { balanceDue: true },
        _count: true,
      }),
      this.prisma.invoice.groupBy({
        by: [],
        where: {
          tenantId, deletedAt: null,
          issuedAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    return { byStatus, totals, overdue, currentMonth: monthly[0] ?? { _sum: { totalAmount: 0 } } };
  }

  async findOne(tenantId: string, id: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { ...INV_SELECT, payments: true, creditNotes: true },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateInvoiceDto>, updatedBy?: string) {
    const inv = await this.findOne(tenantId, id);
    if ([InvoiceStatus.PAID, InvoiceStatus.CANCELLED].includes(inv.status as InvoiceStatus)) {
      throw new BadRequestException('Cannot edit a paid or cancelled invoice');
    }

    const vatRate = dto.vatRate ?? Number(inv.vatRate);
    const discountAmount = dto.discountAmount ?? Number(inv.discountAmount);
    const items = dto.items ?? (inv.items as unknown as CreateInvoiceItemDto[]);
    const financials = this.calcFinancials(items, vatRate, discountAmount);

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        ...dto,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        vatRate, discountAmount, ...financials,
        ...(dto.items !== undefined && {
          items: {
            deleteMany: {},
            create: dto.items.map(i => this.buildItemData(i, vatRate, tenantId)),
          },
        }),
      },
      select: INV_SELECT,
    });

    await this.auditLogService.log({
      tenantId, userId: updatedBy, action: AuditAction.UPDATE,
      resource: 'invoices', resourceId: id, newValues: dto,
    });
    return updated;
  }

  async issue(tenantId: string, id: string, userId?: string) {
    const inv = await this.findOne(tenantId, id);
    if (inv.status !== InvoiceStatus.DRAFT) throw new BadRequestException('Only DRAFT invoices can be issued');

    return this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.ISSUED, issuedAt: new Date() },
      select: INV_SELECT,
    });
  }

  async markSent(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.SENT, sentAt: new Date() },
      select: INV_SELECT,
    });
  }

  async recordPayment(tenantId: string, id: string, amount: number, method: string, reference?: string, paidAt?: string) {
    const inv = await this.findOne(tenantId, id);
    const newPaid = Number(inv.paidAmount) + amount;
    const newBalance = Number(inv.totalAmount) - newPaid;
    const newStatus = newBalance <= 0 ? InvoiceStatus.PAID
      : newPaid > 0 ? InvoiceStatus.PARTIALLY_PAID : inv.status as InvoiceStatus;

    await this.prisma.$transaction([
      this.prisma.invoice.update({
        where: { id },
        data: {
          paidAmount: newPaid,
          balanceDue: Math.max(0, newBalance),
          status: newStatus,
          ...(newStatus === InvoiceStatus.PAID && { paidAt: paidAt ? new Date(paidAt) : new Date() }),
        },
      }),
      this.prisma.payment.create({
        data: {
          tenantId, invoiceId: id,
          clientId: inv.clientId ?? undefined,
          direction: 'INCOMING' as never,
          method: method as never,
          status: 'COMPLETED' as never,
          amount, currency: inv.currency,
          reference, paidAt: paidAt ? new Date(paidAt) : new Date(),
        },
      }),
    ]);

    return this.findOne(tenantId, id);
  }

  async cancel(tenantId: string, id: string, userId?: string) {
    const inv = await this.findOne(tenantId, id);
    if ([InvoiceStatus.PAID, InvoiceStatus.CANCELLED].includes(inv.status as InvoiceStatus)) {
      throw new BadRequestException('Invoice is already paid or cancelled');
    }
    return this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED },
      select: INV_SELECT,
    });
  }

  async remove(tenantId: string, id: string) {
    const inv = await this.findOne(tenantId, id);
    if (inv.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT invoices can be deleted');
    }
    await this.prisma.invoice.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
