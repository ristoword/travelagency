import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { getPaginationParams, buildPaginatedResult } from '../../../common/utils/pagination.util';
import { CreateClientDocumentDto } from './dto/create-document.dto';
import { ClientDocumentType, ClientDocumentStatus } from '@prisma/client';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryDocumentsDto {
  @ApiPropertyOptional({ type: Number }) @IsOptional() page?: number;
  @ApiPropertyOptional({ type: Number }) @IsOptional() limit?: number;
  @ApiPropertyOptional({ enum: ClientDocumentType }) @IsOptional() @IsEnum(ClientDocumentType) type?: ClientDocumentType;
  @ApiPropertyOptional({ enum: ClientDocumentStatus }) @IsOptional() @IsEnum(ClientDocumentStatus) status?: ClientDocumentStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() passengerId?: string;
  @ApiPropertyOptional({ description: 'Filter expiring within N days' }) @IsOptional() expiringWithinDays?: number;
}

function computeStatus(expiryDate: Date | null | undefined): ClientDocumentStatus {
  if (!expiryDate) return ClientDocumentStatus.UNKNOWN;
  const now = new Date();
  const diff = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return ClientDocumentStatus.EXPIRED;
  if (diff <= 90) return ClientDocumentStatus.EXPIRING_SOON;
  return ClientDocumentStatus.VALID;
}

@Injectable()
export class ClientDocumentsService {
  private readonly logger = new Logger(ClientDocumentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateClientDocumentDto, uploadedById?: string) {
    const expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
    const status = computeStatus(expiryDate);

    const doc = await this.prisma.clientDocument.create({
      data: {
        tenantId,
        clientId: dto.clientId,
        passengerId: dto.passengerId,
        type: dto.type,
        status,
        documentNumber: dto.documentNumber,
        issuedBy: dto.issuedBy,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
        expiryDate,
        nationality: dto.nationality ?? 'IT',
        holderFirstName: dto.holderFirstName,
        holderLastName: dto.holderLastName,
        holderBirthDate: dto.holderBirthDate ? new Date(dto.holderBirthDate) : undefined,
        fileUrl: dto.fileUrl,
        fileKey: dto.fileKey,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        notes: dto.notes,
        uploadedById,
      },
    });

    this.logger.log(`Document created: ${doc.type} for client/passenger`);
    return doc;
  }

  async findAll(tenantId: string, query: QueryDocumentsDto) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const now = new Date();
    const expiryThreshold = query.expiringWithinDays
      ? new Date(now.getTime() + Number(query.expiringWithinDays) * 86400000)
      : undefined;

    const where = {
      tenantId,
      ...(query.type && { type: query.type }),
      ...(query.status && { status: query.status }),
      ...(query.clientId && { clientId: query.clientId }),
      ...(query.passengerId && { passengerId: query.passengerId }),
      ...(expiryThreshold && { expiryDate: { lte: expiryThreshold } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.clientDocument.findMany({
        where, skip, take,
        orderBy: { expiryDate: 'asc' },
        include: {
          client: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        },
      }),
      this.prisma.clientDocument.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const doc = await this.prisma.clientDocument.findFirst({
      where: { id, tenantId },
      include: { client: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateClientDocumentDto>) {
    await this.findOne(tenantId, id);
    const expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : undefined;
    const status = expiryDate ? computeStatus(expiryDate) : undefined;

    return this.prisma.clientDocument.update({
      where: { id },
      data: {
        ...dto,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
        expiryDate,
        holderBirthDate: dto.holderBirthDate ? new Date(dto.holderBirthDate) : undefined,
        ...(status && { status }),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.clientDocument.delete({ where: { id } });
  }

  async getExpiryAlerts(tenantId: string) {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86400000);
    const in60 = new Date(now.getTime() + 60 * 86400000);
    const in90 = new Date(now.getTime() + 90 * 86400000);

    const [expired, expiring30, expiring60, expiring90] = await Promise.all([
      this.prisma.clientDocument.count({ where: { tenantId, expiryDate: { lt: now } } }),
      this.prisma.clientDocument.count({ where: { tenantId, expiryDate: { gte: now, lt: in30 } } }),
      this.prisma.clientDocument.count({ where: { tenantId, expiryDate: { gte: in30, lt: in60 } } }),
      this.prisma.clientDocument.count({ where: { tenantId, expiryDate: { gte: in60, lt: in90 } } }),
    ]);

    const criticalDocs = await this.prisma.clientDocument.findMany({
      where: { tenantId, expiryDate: { lt: in30 } },
      orderBy: { expiryDate: 'asc' },
      take: 20,
      include: { client: { select: { id: true, firstName: true, lastName: true, companyName: true } } },
    });

    return {
      summary: { expired, expiring30, expiring60, expiring90 },
      critical: criticalDocs,
    };
  }

  async refreshStatuses(tenantId: string) {
    const docs = await this.prisma.clientDocument.findMany({
      where: { tenantId, expiryDate: { not: null } },
      select: { id: true, expiryDate: true },
    });

    const updates = docs.map(d => this.prisma.clientDocument.update({
      where: { id: d.id },
      data: { status: computeStatus(d.expiryDate) },
    }));

    await this.prisma.$transaction(updates);
    return { updated: updates.length };
  }
}
