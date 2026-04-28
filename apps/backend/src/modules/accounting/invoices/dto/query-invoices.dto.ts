import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceType, InvoiceStatus } from '@prisma/client';

export class QueryInvoicesDto {
  @ApiPropertyOptional({ type: Number }) @IsOptional() page?: number;
  @ApiPropertyOptional({ type: Number }) @IsOptional() limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional({ enum: ['asc', 'desc'] }) @IsOptional() sortOrder?: 'asc' | 'desc';
  @ApiPropertyOptional({ enum: InvoiceStatus }) @IsOptional() @IsEnum(InvoiceStatus) status?: InvoiceStatus;
  @ApiPropertyOptional({ enum: InvoiceType }) @IsOptional() @IsEnum(InvoiceType) type?: InvoiceType;
  @ApiPropertyOptional() @IsOptional() @IsString() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() caseId?: string;
  @ApiPropertyOptional({ description: 'issuedAt from' }) @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional({ description: 'issuedAt to' }) @IsOptional() @IsString() to?: string;
  @ApiPropertyOptional({ description: 'Solo fatture scadute non pagate' }) @IsOptional() overdue?: string;
}
