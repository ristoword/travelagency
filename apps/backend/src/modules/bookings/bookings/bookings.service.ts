import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../../core/audit-log/audit-log.service';
import { getPaginationParams, buildPaginatedResult } from '../../../common/utils/pagination.util';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { AuditAction, BookingStatus, Prisma } from '@prisma/client';

const BOOKING_SELECT = {
  id: true, tenantId: true, number: true, type: true, status: true, description: true,
  caseId: true, clientId: true,
  supplierName: true, supplierRef: true, providerRef: true, confirmationCode: true,
  serviceDate: true, serviceEndDate: true, currency: true,
  amount: true, cost: true, commissionRate: true, commissionAmount: true,
  marginAmount: true, marginPercent: true, isPaidToSupplier: true, paidToSupplierAt: true,
  numberOfPax: true, details: true,
  notes: true, internalNotes: true, cancelledAt: true, cancelReason: true,
  assignedToId: true, createdAt: true, updatedAt: true,
  case: { select: { id: true, number: true, title: true, destination: true } },
  client: { select: { id: true, firstName: true, lastName: true, companyName: true, email: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { documents: true, passengers: true } },
} as const;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async generateNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await this.prisma.sequenceCounter.upsert({
      where: { tenantId_type_year: { tenantId, type: 'booking', year } },
      create: { tenantId, type: 'booking', year, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });
    return `BOO-${year}-${String(counter.lastValue).padStart(4, '0')}`;
  }

  private computeFinancials(amount: number, cost: number, commissionRate?: number) {
    const commissionAmount = commissionRate ? (cost * commissionRate) / 100 : 0;
    const effectiveCost = cost - commissionAmount;
    const marginAmount = amount - effectiveCost;
    const marginPercent = amount > 0 ? (marginAmount / amount) * 100 : 0;
    return {
      commissionAmount: parseFloat(commissionAmount.toFixed(2)),
      marginAmount: parseFloat(marginAmount.toFixed(2)),
      marginPercent: parseFloat(marginPercent.toFixed(2)),
    };
  }

  async create(tenantId: string, dto: CreateBookingDto, createdBy?: string) {
    const number = await this.generateNumber(tenantId);
    const financials = this.computeFinancials(dto.amount, dto.cost ?? 0, dto.commissionRate);

    const booking = await this.prisma.booking.create({
      data: {
        tenantId, number,
        type: dto.type,
        description: dto.description,
        status: dto.status ?? BookingStatus.PENDING,
        caseId: dto.caseId,
        clientId: dto.clientId,
        supplierName: dto.supplierName,
        supplierRef: dto.supplierRef,
        providerRef: dto.providerRef,
        confirmationCode: dto.confirmationCode,
        serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : undefined,
        serviceEndDate: dto.serviceEndDate ? new Date(dto.serviceEndDate) : undefined,
        currency: dto.currency ?? 'EUR',
        amount: dto.amount,
        cost: dto.cost ?? 0,
        commissionRate: dto.commissionRate,
        isPaidToSupplier: dto.isPaidToSupplier ?? false,
        numberOfPax: dto.numberOfPax,
        details: (dto.details ?? undefined) as Prisma.InputJsonValue | undefined,
        notes: dto.notes,
        internalNotes: dto.internalNotes,
        assignedToId: dto.assignedToId,
        ...financials,
      },
      select: BOOKING_SELECT,
    });

    await this.auditLogService.log({
      tenantId, userId: createdBy, action: AuditAction.CREATE,
      resource: 'bookings', resourceId: booking.id,
      newValues: { number: booking.number, type: booking.type, amount: booking.amount },
    });

    this.logger.log(`Booking created: ${number} (${dto.type})`);
    return booking;
  }

  async findAll(tenantId: string, query: QueryBookingsDto) {
    const { skip, take, page, limit } = getPaginationParams(query);

    const where = {
      tenantId, deletedAt: null,
      ...(query.type && { type: query.type }),
      ...(query.status && { status: query.status }),
      ...(query.caseId && { caseId: query.caseId }),
      ...(query.clientId && { clientId: query.clientId }),
      ...(query.assignedToId && { assignedToId: query.assignedToId }),
      ...((query.from || query.to) && {
        serviceDate: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to) }),
        },
      }),
      ...(query.search && {
        OR: [
          { number: { contains: query.search, mode: 'insensitive' as const } },
          { description: { contains: query.search, mode: 'insensitive' as const } },
          { supplierName: { contains: query.search, mode: 'insensitive' as const } },
          { confirmationCode: { contains: query.search, mode: 'insensitive' as const } },
          { providerRef: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where, skip, take,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        select: BOOKING_SELECT,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async getStats(tenantId: string) {
    const [byType, byStatus, financial, upcoming] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['type'],
        where: { tenantId, deletedAt: null },
        _count: true,
        _sum: { amount: true, marginAmount: true },
      }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      this.prisma.booking.aggregate({
        where: { tenantId, deletedAt: null },
        _sum: { amount: true, cost: true, marginAmount: true, commissionAmount: true },
        _avg: { marginPercent: true },
        _count: true,
      }),
      this.prisma.booking.findMany({
        where: {
          tenantId, deletedAt: null,
          status: BookingStatus.CONFIRMED,
          serviceDate: { gte: new Date() },
        },
        take: 5,
        orderBy: { serviceDate: 'asc' },
        select: BOOKING_SELECT,
      }),
    ]);

    const unpaid = await this.prisma.booking.aggregate({
      where: { tenantId, deletedAt: null, isPaidToSupplier: false, status: BookingStatus.CONFIRMED },
      _sum: { cost: true },
      _count: true,
    });

    return { byType, byStatus, financial, upcoming, unpaidToSupplier: unpaid };
  }

  async findOne(tenantId: string, id: string) {
    const b = await this.prisma.booking.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        ...BOOKING_SELECT,
        documents: true,
        passengers: true,
      },
    });
    if (!b) throw new NotFoundException('Booking not found');
    return b;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateBookingDto>, updatedBy?: string) {
    const existing = await this.findOne(tenantId, id);

    const amount = dto.amount ?? Number(existing.amount);
    const cost = dto.cost ?? Number(existing.cost);
    const commissionRate = dto.commissionRate ?? (existing.commissionRate ? Number(existing.commissionRate) : undefined);
    const financials = this.computeFinancials(amount, cost, commissionRate);

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        description: dto.description,
        supplierName: dto.supplierName,
        supplierRef: dto.supplierRef,
        providerRef: dto.providerRef,
        confirmationCode: dto.confirmationCode,
        currency: dto.currency,
        amount: dto.amount,
        cost: dto.cost,
        commissionRate: dto.commissionRate,
        isPaidToSupplier: dto.isPaidToSupplier,
        numberOfPax: dto.numberOfPax,
        notes: dto.notes,
        internalNotes: dto.internalNotes,
        assignedToId: dto.assignedToId,
        serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : undefined,
        serviceEndDate: dto.serviceEndDate ? new Date(dto.serviceEndDate) : undefined,
        details: (dto.details ?? undefined) as Prisma.InputJsonValue | undefined,
        ...financials,
      },
      select: BOOKING_SELECT,
    });

    await this.auditLogService.log({
      tenantId, userId: updatedBy, action: AuditAction.UPDATE,
      resource: 'bookings', resourceId: id,
      oldValues: { status: existing.status },
      newValues: { amount: dto.amount, status: dto.status },
    });

    return updated;
  }

  async confirm(tenantId: string, id: string, confirmationCode?: string, userId?: string) {
    const b = await this.findOne(tenantId, id);
    if (b.status === BookingStatus.CONFIRMED) {
      throw new BadRequestException('Booking is already confirmed');
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CONFIRMED,
        ...(confirmationCode && { confirmationCode }),
      },
      select: BOOKING_SELECT,
    });

    await this.auditLogService.log({
      tenantId, userId, action: AuditAction.UPDATE,
      resource: 'bookings', resourceId: id,
      newValues: { status: BookingStatus.CONFIRMED, confirmationCode },
    });

    return updated;
  }

  async cancel(tenantId: string, id: string, reason?: string, userId?: string) {
    await this.findOne(tenantId, id);

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED, cancelledAt: new Date(), cancelReason: reason },
      select: BOOKING_SELECT,
    });

    await this.auditLogService.log({
      tenantId, userId, action: AuditAction.UPDATE,
      resource: 'bookings', resourceId: id,
      newValues: { status: BookingStatus.CANCELLED, cancelReason: reason },
    });

    return updated;
  }

  async markPaidToSupplier(tenantId: string, id: string, userId?: string) {
    await this.findOne(tenantId, id);
    return this.prisma.booking.update({
      where: { id },
      data: { isPaidToSupplier: true, paidToSupplierAt: new Date() },
      select: BOOKING_SELECT,
    });
  }

  async remove(tenantId: string, id: string, deletedBy?: string) {
    const b = await this.findOne(tenantId, id);
    if (b.status === BookingStatus.CONFIRMED) {
      throw new BadRequestException('Cannot delete a confirmed booking. Cancel it first.');
    }
    await this.prisma.booking.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.auditLogService.log({
      tenantId, userId: deletedBy, action: AuditAction.DELETE, resource: 'bookings', resourceId: id,
    });
  }
}
