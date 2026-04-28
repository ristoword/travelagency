import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { getPaginationParams, buildPaginatedResult } from '../../../common/utils/pagination.util';
import { PaymentMethod, PaymentStatus, PaymentDirection } from '@prisma/client';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export interface CreatePaymentDto {
  invoiceId?: string;
  clientId?: string;
  caseId?: string;
  direction?: PaymentDirection;
  method: PaymentMethod;
  amount: number;
  currency?: string;
  reference?: string;
  notes?: string;
  paidAt?: string;
}

export class QueryPaymentsDto {
  @ApiPropertyOptional({ type: Number }) @IsOptional() page?: number;
  @ApiPropertyOptional({ type: Number }) @IsOptional() limit?: number;
  @ApiPropertyOptional({ enum: PaymentStatus }) @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @ApiPropertyOptional({ enum: PaymentDirection }) @IsOptional() @IsEnum(PaymentDirection) direction?: PaymentDirection;
  @ApiPropertyOptional({ enum: PaymentMethod }) @IsOptional() @IsEnum(PaymentMethod) method?: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @IsString() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
}

const PAY_SELECT = {
  id: true, tenantId: true, invoiceId: true, clientId: true, caseId: true,
  direction: true, method: true, status: true,
  amount: true, currency: true, reference: true, notes: true, paidAt: true,
  createdAt: true, updatedAt: true,
  invoice: { select: { id: true, number: true, totalAmount: true } },
  client: { select: { id: true, firstName: true, lastName: true, companyName: true } },
} as const;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreatePaymentDto) {
    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        invoiceId: dto.invoiceId,
        clientId: dto.clientId,
        caseId: dto.caseId,
        direction: dto.direction ?? PaymentDirection.INCOMING,
        method: dto.method,
        status: PaymentStatus.COMPLETED,
        amount: dto.amount,
        currency: dto.currency ?? 'EUR',
        reference: dto.reference,
        notes: dto.notes,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
      },
      select: PAY_SELECT,
    });
    this.logger.log(`Payment created: ${payment.amount}€ (${payment.method})`);
    return payment;
  }

  async findAll(tenantId: string, query: QueryPaymentsDto) {
    const { skip, take, page, limit } = getPaginationParams(query);

    const where = {
      tenantId,
      ...(query.status && { status: query.status }),
      ...(query.direction && { direction: query.direction }),
      ...(query.method && { method: query.method }),
      ...(query.clientId && { clientId: query.clientId }),
      ...(query.invoiceId && { invoiceId: query.invoiceId }),
      ...((query.from || query.to) && {
        paidAt: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to) }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({ where, skip, take, orderBy: { paidAt: 'desc' }, select: PAY_SELECT }),
      this.prisma.payment.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async getCashFlowStats(tenantId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [monthly, yearly, byMethod] = await Promise.all([
      this.prisma.payment.groupBy({
        by: ['direction'],
        where: { tenantId, status: PaymentStatus.COMPLETED, paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.payment.groupBy({
        by: ['direction'],
        where: { tenantId, status: PaymentStatus.COMPLETED, paidAt: { gte: startOfYear } },
        _sum: { amount: true },
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { tenantId, status: PaymentStatus.COMPLETED, direction: PaymentDirection.INCOMING },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const monthlyIn = monthly.find(m => m.direction === 'INCOMING')?._sum.amount ?? 0;
    const monthlyOut = monthly.find(m => m.direction === 'OUTGOING')?._sum.amount ?? 0;
    const yearlyIn = yearly.find(m => m.direction === 'INCOMING')?._sum.amount ?? 0;
    const yearlyOut = yearly.find(m => m.direction === 'OUTGOING')?._sum.amount ?? 0;

    return {
      monthly: { incoming: monthlyIn, outgoing: monthlyOut, net: Number(monthlyIn) - Number(monthlyOut) },
      yearly: { incoming: yearlyIn, outgoing: yearlyOut, net: Number(yearlyIn) - Number(yearlyOut) },
      byMethod,
    };
  }

  async findOne(tenantId: string, id: string) {
    const p = await this.prisma.payment.findFirst({ where: { id, tenantId }, select: PAY_SELECT });
    if (!p) throw new NotFoundException('Payment not found');
    return p;
  }
}
