import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ContractStatus } from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsDateString, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContractDto {
  @ApiProperty({ example: 'Contratto Commissioni 2025' }) @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: ContractStatus }) @IsOptional() @IsEnum(ContractStatus) status?: ContractStatus;
  @ApiPropertyOptional({ example: '2025-01-01' }) @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional({ example: '2025-12-31' }) @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoRenew?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) noticeDays?: number;
  @ApiPropertyOptional({ example: 10 }) @IsOptional() @IsNumber() @Min(0) commissionRate?: number;
  @ApiPropertyOptional({ example: 5 }) @IsOptional() @IsNumber() @Min(0) netRateDiscount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) paymentTermsDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() fileUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

@Injectable()
export class SupplierContractsService {
  private readonly logger = new Logger(SupplierContractsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async checkSupplier(tenantId: string, supplierId: string) {
    const s = await this.prisma.supplier.findFirst({ where: { id: supplierId, tenantId, deletedAt: null } });
    if (!s) throw new NotFoundException('Supplier not found');
  }

  async create(tenantId: string, supplierId: string, dto: CreateContractDto) {
    await this.checkSupplier(tenantId, supplierId);
    const contract = await this.prisma.supplierContract.create({
      data: {
        tenantId, supplierId, ...dto,
        status: dto.status ?? ContractStatus.DRAFT,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
    this.logger.log(`Contract created: ${contract.title} for supplier ${supplierId}`);
    return contract;
  }

  async findBySupplierId(tenantId: string, supplierId: string) {
    await this.checkSupplier(tenantId, supplierId);
    return this.prisma.supplierContract.findMany({
      where: { supplierId, tenantId },
      orderBy: { startDate: 'desc' },
      include: { commissions: { take: 5 } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const c = await this.prisma.supplierContract.findFirst({
      where: { id, tenantId },
      include: { commissions: true, supplier: { select: { id: true, name: true, type: true } } },
    });
    if (!c) throw new NotFoundException('Contract not found');
    return c;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateContractDto>) {
    await this.findOne(tenantId, id);
    return this.prisma.supplierContract.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async getExpiringContracts(tenantId: string, withinDays = 30) {
    const threshold = new Date(Date.now() + withinDays * 86400000);
    return this.prisma.supplierContract.findMany({
      where: {
        tenantId,
        status: ContractStatus.ACTIVE,
        endDate: { lte: threshold, gte: new Date() },
      },
      include: { supplier: { select: { id: true, name: true, type: true } } },
      orderBy: { endDate: 'asc' },
    });
  }

  async addCommission(tenantId: string, contractId: string, dto: {
    type: string; serviceType?: string; rate: number; currency?: string;
    validFrom?: string; validUntil?: string; notes?: string;
  }) {
    const contract = await this.findOne(tenantId, contractId);
    return this.prisma.supplierCommission.create({
      data: {
        tenantId,
        supplierId: contract.supplierId,
        contractId,
        type: dto.type as never,
        serviceType: dto.serviceType,
        rate: dto.rate,
        currency: dto.currency ?? 'EUR',
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        notes: dto.notes,
      },
    });
  }
}
