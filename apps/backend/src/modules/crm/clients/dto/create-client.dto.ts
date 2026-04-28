import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  MaxLength,
  IsUUID,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClientType, ClientStatus, ClientSource } from '@prisma/client';

export class CreateClientDto {
  @ApiPropertyOptional({ enum: ClientType, default: ClientType.INDIVIDUAL })
  @IsOptional()
  @IsEnum(ClientType)
  type?: ClientType;

  @ApiPropertyOptional({ enum: ClientSource, default: ClientSource.OTHER })
  @IsOptional()
  @IsEnum(ClientSource)
  source?: ClientSource;

  // Personal
  @ApiPropertyOptional({ example: 'Marco' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Rossi' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'Agenzia Esempio S.r.l.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({ example: 'RSSMRC80A01H501Z' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  taxCode?: string;

  @ApiPropertyOptional({ example: 'IT12345678901' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  vatNumber?: string;

  @ApiPropertyOptional({ example: '1980-01-01' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  // Contact
  @ApiPropertyOptional({ example: 'marco.rossi@email.it' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+39 06 1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: '+39 333 1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  mobile?: string;

  @ApiPropertyOptional({ example: 'https://www.esempio.it' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  // Address
  @ApiPropertyOptional({ example: 'Via Roma 1' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ example: 'Roma' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'RM' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  province?: string;

  @ApiPropertyOptional({ example: '00100' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @ApiPropertyOptional({ example: 'IT' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  // Preferences
  @ApiPropertyOptional({ example: 'it' })
  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsString()
  preferredCurrency?: string;

  // Flags
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isVip?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isNewsletterSubscribed?: boolean;

  // Internal
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Tag IDs to assign' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ enum: ClientStatus, default: ClientStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;
}
