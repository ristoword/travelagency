import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierType, SupplierStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class QuerySuppliersDto {
  @ApiPropertyOptional({ type: Number }) @IsOptional() page?: number;
  @ApiPropertyOptional({ type: Number }) @IsOptional() limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional({ enum: ['asc', 'desc'] }) @IsOptional() sortOrder?: 'asc' | 'desc';
  @ApiPropertyOptional({ enum: SupplierType }) @IsOptional() @IsEnum(SupplierType) type?: SupplierType;
  @ApiPropertyOptional({ enum: SupplierStatus }) @IsOptional() @IsEnum(SupplierStatus) status?: SupplierStatus;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() isPreferred?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
}
