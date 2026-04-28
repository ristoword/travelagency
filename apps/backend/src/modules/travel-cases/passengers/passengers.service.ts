import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  IsString, IsOptional, IsBoolean, IsDateString, MaxLength, MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePassengerDto {
  @ApiProperty({ example: 'Giuseppe' }) @IsString() @MinLength(2) firstName: string;
  @ApiProperty({ example: 'Ferrari' }) @IsString() @MinLength(2) lastName: string;
  @ApiPropertyOptional({ example: '1975-05-20' }) @IsOptional() @IsDateString() birthDate?: string;
  @ApiPropertyOptional({ example: 'IT' }) @IsOptional() @IsString() nationality?: string;
  @ApiPropertyOptional({ example: 'FRRPPL75E20H501Z' }) @IsOptional() @IsString() @MaxLength(16) taxCode?: string;
  @ApiPropertyOptional({ example: 'AA1234567' }) @IsOptional() @IsString() passportNumber?: string;
  @ApiPropertyOptional({ example: '2030-12-31' }) @IsOptional() @IsDateString() passportExpiry?: string;
  @ApiPropertyOptional({ example: 'Questura di Roma' }) @IsOptional() @IsString() passportIssuedBy?: string;
  @ApiPropertyOptional({ example: 'giuseppe.ferrari@email.it' }) @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional({ example: '+39 347 1111111' }) @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isLeader?: boolean;
  @ApiPropertyOptional({ example: 'standard' }) @IsOptional() @IsString() mealPreference?: string;
  @ApiPropertyOptional({ example: 'window' }) @IsOptional() @IsString() seatPreference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() specialNeeds?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

@Injectable()
export class PassengersService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkCase(tenantId: string, caseId: string) {
    const c = await this.prisma.travelCase.findFirst({ where: { id: caseId, tenantId, deletedAt: null } });
    if (!c) throw new NotFoundException('Travel case not found');
  }

  async create(tenantId: string, caseId: string, dto: CreatePassengerDto) {
    await this.checkCase(tenantId, caseId);
    if (dto.isLeader) {
      await this.prisma.passenger.updateMany({ where: { caseId, isLeader: true }, data: { isLeader: false } });
    }
    return this.prisma.passenger.create({
      data: {
        tenantId, caseId, ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        passportExpiry: dto.passportExpiry ? new Date(dto.passportExpiry) : undefined,
      },
    });
  }

  async findByCaseId(tenantId: string, caseId: string) {
    await this.checkCase(tenantId, caseId);
    return this.prisma.passenger.findMany({
      where: { caseId, tenantId },
      orderBy: [{ isLeader: 'desc' }, { lastName: 'asc' }],
    });
  }

  async findOne(tenantId: string, id: string) {
    const p = await this.prisma.passenger.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Passenger not found');
    return p;
  }

  async update(tenantId: string, id: string, dto: Partial<CreatePassengerDto>) {
    await this.findOne(tenantId, id);
    if (dto.isLeader) {
      const p = await this.prisma.passenger.findUnique({ where: { id } });
      await this.prisma.passenger.updateMany({ where: { caseId: p!.caseId, isLeader: true }, data: { isLeader: false } });
    }
    return this.prisma.passenger.update({
      where: { id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        passportExpiry: dto.passportExpiry ? new Date(dto.passportExpiry) : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.passenger.delete({ where: { id } });
  }
}
