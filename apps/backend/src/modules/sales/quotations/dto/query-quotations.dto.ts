import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuotationStatus } from '@prisma/client';

export class QueryQuotationsDto {
  @ApiPropertyOptional({ type: Number }) @IsOptional() page?: number;
  @ApiPropertyOptional({ type: Number }) @IsOptional() limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional({ enum: ['asc', 'desc'] }) @IsOptional() sortOrder?: 'asc' | 'desc';
  @ApiPropertyOptional({ enum: QuotationStatus }) @IsOptional() @IsEnum(QuotationStatus) status?: QuotationStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() leadId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedToId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() destination?: string;
}
