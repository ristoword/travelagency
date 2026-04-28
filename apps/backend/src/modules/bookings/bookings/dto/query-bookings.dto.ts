import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingType, BookingStatus } from '@prisma/client';

export class QueryBookingsDto {
  @ApiPropertyOptional({ type: Number }) @IsOptional() page?: number;
  @ApiPropertyOptional({ type: Number }) @IsOptional() limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional({ enum: ['asc', 'desc'] }) @IsOptional() sortOrder?: 'asc' | 'desc';
  @ApiPropertyOptional({ enum: BookingType }) @IsOptional() @IsEnum(BookingType) type?: BookingType;
  @ApiPropertyOptional({ enum: BookingStatus }) @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() caseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedToId?: string;
  @ApiPropertyOptional({ description: 'From date (serviceDate >=)' }) @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional({ description: 'To date (serviceDate <=)' }) @IsOptional() @IsString() to?: string;
}
