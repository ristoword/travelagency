import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantPlan } from '@prisma/client';

export class CreateTenantDto {
  @ApiProperty({ example: 'Agenzia Viaggi Roma' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'agenzia-roma', description: 'Unique URL slug' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug can only contain lowercase letters, numbers and hyphens',
  })
  slug: string;

  @ApiPropertyOptional({ example: 'info@agenziaroma.it' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+39 06 1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'Via Roma 1, 00100 Roma' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ example: 'Roma' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'IT', default: 'IT' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ example: 'IT12345678901' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  vatNumber?: string;

  @ApiPropertyOptional({ enum: TenantPlan, default: TenantPlan.STARTER })
  @IsOptional()
  @IsEnum(TenantPlan)
  plan?: TenantPlan;
}
