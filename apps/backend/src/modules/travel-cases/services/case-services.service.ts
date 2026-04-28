import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  IsString, IsOptional, IsEnum, IsNumber, IsInt, IsDateString, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CaseServiceType, CaseServiceStatus } from '@prisma/client';

export class CreateCaseServiceDto {
  @ApiProperty({ enum: CaseServiceType }) @IsEnum(CaseServiceType) type: CaseServiceType;
  @ApiProperty({ example: 'Volo AZ001 Roma → Malé' }) @IsString() description: string;
  @ApiPropertyOptional({ example: 'ITA Airways' }) @IsOptional() @IsString() provider?: string;
  @ApiPropertyOptional({ example: 'AZ001-250615' }) @IsOptional() @IsString() providerRef?: string;
  @ApiPropertyOptional({ enum: CaseServiceStatus }) @IsOptional() @IsEnum(CaseServiceStatus) status?: CaseServiceStatus;
  @ApiPropertyOptional({ example: '2025-06-15T10:30:00' }) @IsOptional() @IsDateString() serviceDate?: string;
  @ApiPropertyOptional({ example: '2025-06-15T18:00:00' }) @IsOptional() @IsDateString() serviceEndDate?: string;
  @ApiPropertyOptional({ example: 3600 }) @IsOptional() @IsNumber() @Min(0) amount?: number;
  @ApiPropertyOptional({ example: 2800 }) @IsOptional() @IsNumber() @Min(0) cost?: number;
  @ApiPropertyOptional({ example: 'EUR' }) @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional({ example: 2 }) @IsOptional() @IsInt() @Min(1) numberOfPax?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() confirmationDoc?: string;
}

@Injectable()
export class CaseServicesService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkCase(tenantId: string, caseId: string) {
    const c = await this.prisma.travelCase.findFirst({ where: { id: caseId, tenantId, deletedAt: null } });
    if (!c) throw new NotFoundException('Travel case not found');
  }

  async create(tenantId: string, caseId: string, dto: CreateCaseServiceDto) {
    await this.checkCase(tenantId, caseId);
    return this.prisma.caseService.create({
      data: {
        tenantId, caseId, ...dto,
        status: dto.status ?? CaseServiceStatus.PENDING,
        serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : undefined,
        serviceEndDate: dto.serviceEndDate ? new Date(dto.serviceEndDate) : undefined,
      },
    });
  }

  async findByCaseId(tenantId: string, caseId: string) {
    await this.checkCase(tenantId, caseId);
    return this.prisma.caseService.findMany({
      where: { caseId, tenantId },
      orderBy: { serviceDate: 'asc' },
    });
  }

  async update(tenantId: string, id: string, dto: Partial<CreateCaseServiceDto>) {
    const s = await this.prisma.caseService.findFirst({ where: { id, tenantId } });
    if (!s) throw new NotFoundException('Service not found');
    return this.prisma.caseService.update({
      where: { id },
      data: {
        ...dto,
        serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : undefined,
        serviceEndDate: dto.serviceEndDate ? new Date(dto.serviceEndDate) : undefined,
      },
    });
  }

  async confirm(tenantId: string, id: string, providerRef?: string) {
    const s = await this.prisma.caseService.findFirst({ where: { id, tenantId } });
    if (!s) throw new NotFoundException('Service not found');
    return this.prisma.caseService.update({
      where: { id },
      data: { status: CaseServiceStatus.CONFIRMED, ...(providerRef && { providerRef }) },
    });
  }

  async remove(tenantId: string, id: string) {
    const s = await this.prisma.caseService.findFirst({ where: { id, tenantId } });
    if (!s) throw new NotFoundException('Service not found');
    await this.prisma.caseService.delete({ where: { id } });
  }
}
