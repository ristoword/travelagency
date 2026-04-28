import {
  Injectable, NotFoundException, ConflictException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../../core/audit-log/audit-log.service';
import { AuditAction, ProposalStatus, QuotationStatus } from '@prisma/client';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProposalDto {
  @ApiProperty({ example: 'Proposta Viaggio Maldive — Famiglia Ferrari' })
  @IsString() title: string;

  @ApiProperty({ example: '# Benvenuti!\n\nAbbiamo preparato per voi...' })
  @IsString() content: string;
}

@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(tenantId: string, quotationId: string, dto: CreateProposalDto, createdBy?: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: quotationId, tenantId, deletedAt: null },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');

    const existing = await this.prisma.proposal.findUnique({ where: { quotationId } });
    if (existing) throw new ConflictException('A proposal already exists for this quotation');

    const proposal = await this.prisma.proposal.create({
      data: { tenantId, quotationId, ...dto },
    });

    await this.auditLogService.log({
      tenantId, userId: createdBy, action: AuditAction.CREATE,
      resource: 'proposals', resourceId: proposal.id,
      newValues: { title: dto.title, quotationId },
    });

    return proposal;
  }

  async findByQuotation(tenantId: string, quotationId: string) {
    return this.prisma.proposal.findFirst({
      where: { quotationId, tenantId },
      include: {
        quotation: {
          select: {
            number: true, destination: true, totalAmount: true,
            currency: true, validUntil: true, items: true,
            client: { select: { firstName: true, lastName: true, companyName: true, email: true } },
          },
        },
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.proposal.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        quotation: {
          select: {
            number: true, destination: true, totalAmount: true,
            client: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
  }

  async update(tenantId: string, id: string, dto: Partial<CreateProposalDto>) {
    const proposal = await this.prisma.proposal.findFirst({ where: { id, tenantId } });
    if (!proposal) throw new NotFoundException('Proposal not found');
    if (proposal.status === ProposalStatus.ACCEPTED) {
      throw new BadRequestException('Cannot edit an accepted proposal');
    }
    return this.prisma.proposal.update({ where: { id }, data: dto });
  }

  async send(tenantId: string, id: string) {
    const proposal = await this.prisma.proposal.findFirst({ where: { id, tenantId } });
    if (!proposal) throw new NotFoundException('Proposal not found');

    const updated = await this.prisma.proposal.update({
      where: { id },
      data: { status: ProposalStatus.SENT, sentAt: new Date() },
    });

    // also mark quotation as SENT
    await this.prisma.quotation.update({
      where: { id: proposal.quotationId },
      data: { status: QuotationStatus.SENT, sentAt: new Date() },
    });

    return updated;
  }

  async markViewed(tenantId: string, id: string) {
    const proposal = await this.prisma.proposal.findFirst({ where: { id, tenantId } });
    if (!proposal) throw new NotFoundException('Proposal not found');

    return this.prisma.proposal.update({
      where: { id },
      data: { status: ProposalStatus.VIEWED, viewedAt: new Date() },
    });
  }

  async accept(tenantId: string, id: string, userId?: string) {
    const proposal = await this.prisma.proposal.findFirst({ where: { id, tenantId } });
    if (!proposal) throw new NotFoundException('Proposal not found');

    await this.prisma.$transaction([
      this.prisma.proposal.update({
        where: { id },
        data: { status: ProposalStatus.ACCEPTED, acceptedAt: new Date() },
      }),
      this.prisma.quotation.update({
        where: { id: proposal.quotationId },
        data: { status: QuotationStatus.ACCEPTED, acceptedAt: new Date() },
      }),
    ]);

    await this.auditLogService.log({
      tenantId, userId, action: AuditAction.UPDATE,
      resource: 'proposals', resourceId: id,
      newValues: { status: ProposalStatus.ACCEPTED },
    });

    return this.prisma.proposal.findUnique({ where: { id } });
  }

  async reject(tenantId: string, id: string, userId?: string) {
    const proposal = await this.prisma.proposal.findFirst({ where: { id, tenantId } });
    if (!proposal) throw new NotFoundException('Proposal not found');

    await this.prisma.$transaction([
      this.prisma.proposal.update({
        where: { id },
        data: { status: ProposalStatus.REJECTED, rejectedAt: new Date() },
      }),
      this.prisma.quotation.update({
        where: { id: proposal.quotationId },
        data: { status: QuotationStatus.REJECTED, rejectedAt: new Date() },
      }),
    ]);

    return this.prisma.proposal.findUnique({ where: { id } });
  }
}
