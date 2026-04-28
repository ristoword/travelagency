import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CaseStatus } from '@prisma/client';

export class QueryCasesDto {
  @ApiPropertyOptional({ type: Number }) @IsOptional() page?: number;
  @ApiPropertyOptional({ type: Number }) @IsOptional() limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional({ enum: ['asc', 'desc'] }) @IsOptional() sortOrder?: 'asc' | 'desc';
  @ApiPropertyOptional({ enum: CaseStatus }) @IsOptional() @IsEnum(CaseStatus) status?: CaseStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedToId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() destination?: string;
}
