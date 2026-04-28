import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreditNoteStatus } from '@prisma/client';
import { IsString, IsOptional, IsNumber, IsUUID, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCreditNoteDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() invoiceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() clientId?: string;
  @ApiProperty({ example: 'Annullamento parziale — rimborso supplemento camera' }) @IsString() @MaxLength(500) reason: string;
  @ApiProperty({ example: 500 }) @IsNumber() @Min(0.01) amount: number;
  @ApiPropertyOptional({ example: 22, description: 'IVA %' }) @IsOptional() @IsNumber() @Min(0) vatRate?: number;
  @ApiPropertyOptional({ example: 'EUR' }) @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

@Injectable()
export class CreditNotesService {
  private readonly logger = new Logger(CreditNotesService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async generateNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await this.prisma.sequenceCounter.upsert({
      where: { tenantId_type_year: { tenantId, type: 'credit_note', year } },
      create: { tenantId, type: 'credit_note', year, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });
    return `NC-${year}-${String(counter.lastValue).padStart(4, '0')}`;
  }

  async create(tenantId: string, dto: CreateCreditNoteDto) {
    const number = await this.generateNumber(tenantId);
    const vatRate = dto.vatRate ?? 22;
    const vatAmount = parseFloat((dto.amount * vatRate / 100).toFixed(2));
    const totalAmount = parseFloat((dto.amount + vatAmount).toFixed(2));

    const cn = await this.prisma.creditNote.create({
      data: {
        tenantId, number,
        status: CreditNoteStatus.DRAFT,
        invoiceId: dto.invoiceId,
        clientId: dto.clientId,
        reason: dto.reason,
        amount: dto.amount,
        vatAmount, totalAmount,
        currency: dto.currency ?? 'EUR',
        notes: dto.notes,
      },
    });

    this.logger.log(`Credit note created: ${number}`);
    return cn;
  }

  async findAll(tenantId: string) {
    return this.prisma.creditNote.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        invoice: { select: { id: true, number: true } },
        client: { select: { id: true, firstName: true, lastName: true, companyName: true } },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const cn = await this.prisma.creditNote.findFirst({
      where: { id, tenantId },
      include: {
        invoice: { select: { id: true, number: true, totalAmount: true, paidAmount: true } },
        client: { select: { id: true, firstName: true, lastName: true, companyName: true } },
      },
    });
    if (!cn) throw new NotFoundException('Credit note not found');
    return cn;
  }

  async issue(tenantId: string, id: string) {
    const cn = await this.findOne(tenantId, id);
    if (cn.status !== CreditNoteStatus.DRAFT) throw new BadRequestException('Only DRAFT credit notes can be issued');
    return this.prisma.creditNote.update({
      where: { id },
      data: { status: CreditNoteStatus.ISSUED, issuedAt: new Date() },
    });
  }

  async apply(tenantId: string, id: string) {
    const cn = await this.findOne(tenantId, id);
    if (cn.status !== CreditNoteStatus.ISSUED) throw new BadRequestException('Only ISSUED credit notes can be applied');

    await this.prisma.creditNote.update({
      where: { id },
      data: { status: CreditNoteStatus.APPLIED, appliedAt: new Date() },
    });

    // Reduce invoice balance if linked
    if (cn.invoiceId) {
      const inv = await this.prisma.invoice.findUnique({ where: { id: cn.invoiceId } });
      if (inv) {
        const newBalance = Math.max(0, Number(inv.balanceDue) - Number(cn.totalAmount));
        const newPaid = Number(inv.paidAmount) + Number(cn.totalAmount);
        const newStatus = newBalance <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : inv.status;
        await this.prisma.invoice.update({
          where: { id: cn.invoiceId },
          data: { balanceDue: newBalance, paidAmount: newPaid, status: newStatus as never },
        });
      }
    }

    return this.findOne(tenantId, id);
  }
}
