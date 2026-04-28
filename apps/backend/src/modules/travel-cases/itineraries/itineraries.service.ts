import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  IsString, IsOptional, IsInt, IsBoolean, IsDateString, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateItineraryDayDto {
  @ApiProperty({ example: 1 }) @IsInt() @Min(1) dayNumber: number;
  @ApiPropertyOptional({ example: '2025-06-15' }) @IsOptional() @IsDateString() date?: string;
  @ApiProperty({ example: 'Arrivo a Malé — transfer al resort in idrovolante' }) @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ example: 'Malé, Maldive' }) @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional({ example: 'Conrad Maldives Rangali Island' }) @IsOptional() @IsString() accommodation?: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() breakfast?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() lunch?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() dinner?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

@Injectable()
export class ItinerariesService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkCase(tenantId: string, caseId: string) {
    const c = await this.prisma.travelCase.findFirst({ where: { id: caseId, tenantId, deletedAt: null } });
    if (!c) throw new NotFoundException('Travel case not found');
  }

  async create(tenantId: string, caseId: string, dto: CreateItineraryDayDto) {
    await this.checkCase(tenantId, caseId);
    return this.prisma.caseItinerary.create({
      data: {
        tenantId, caseId, ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  async createMany(tenantId: string, caseId: string, days: CreateItineraryDayDto[]) {
    await this.checkCase(tenantId, caseId);
    await this.prisma.caseItinerary.deleteMany({ where: { caseId } });
    return this.prisma.caseItinerary.createMany({
      data: days.map(d => ({
        tenantId, caseId, ...d,
        date: d.date ? new Date(d.date) : undefined,
      })),
    });
  }

  async findByCaseId(tenantId: string, caseId: string) {
    await this.checkCase(tenantId, caseId);
    return this.prisma.caseItinerary.findMany({
      where: { caseId, tenantId },
      orderBy: { dayNumber: 'asc' },
    });
  }

  async update(tenantId: string, id: string, dto: Partial<CreateItineraryDayDto>) {
    const day = await this.prisma.caseItinerary.findFirst({ where: { id, tenantId } });
    if (!day) throw new NotFoundException('Itinerary day not found');
    return this.prisma.caseItinerary.update({
      where: { id },
      data: { ...dto, date: dto.date ? new Date(dto.date) : undefined },
    });
  }

  async remove(tenantId: string, id: string) {
    const day = await this.prisma.caseItinerary.findFirst({ where: { id, tenantId } });
    if (!day) throw new NotFoundException('Itinerary day not found');
    await this.prisma.caseItinerary.delete({ where: { id } });
  }
}
