import {
  IsString, IsOptional, IsEnum, IsNumber, IsInt,
  IsDateString, IsUUID, IsBoolean, MaxLength, Min, IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingType, BookingStatus } from '@prisma/client';

export class CreateBookingDto {
  @ApiProperty({ enum: BookingType, example: BookingType.FLIGHT })
  @IsEnum(BookingType)
  type: BookingType;

  @ApiProperty({ example: 'Volo A/R Roma FCO → Malé MLE, Business Class — 2 pax' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ enum: BookingStatus, default: BookingStatus.PENDING })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  // Links
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;

  // Supplier
  @ApiPropertyOptional({ example: 'ITA Airways' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplierName?: string;

  @ApiPropertyOptional({ example: 'IATA-AZ001' })
  @IsOptional()
  @IsString()
  supplierRef?: string;

  @ApiPropertyOptional({ example: 'GDS-PNR-ABCDEF', description: 'GDS or bedbank reference' })
  @IsOptional()
  @IsString()
  providerRef?: string;

  @ApiPropertyOptional({ example: 'CONF-2025-AZ123' })
  @IsOptional()
  @IsString()
  confirmationCode?: string;

  // Dates
  @ApiPropertyOptional({ example: '2025-06-15T10:30:00' })
  @IsOptional()
  @IsDateString()
  serviceDate?: string;

  @ApiPropertyOptional({ example: '2025-06-29T18:00:00' })
  @IsOptional()
  @IsDateString()
  serviceEndDate?: string;

  // Financial
  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 3600, description: 'Prezzo venduto al cliente' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 2800, description: 'Costo netto dal fornitore' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ example: 10, description: 'Commissione % dal fornitore' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionRate?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPaidToSupplier?: boolean;

  // Pax
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfPax?: number;

  @ApiPropertyOptional({
    description: 'Dati specifici per tipo (JSON libero)',
    example: {
      from: 'FCO',
      to: 'MLE',
      airline: 'ITA Airways',
      flightNumber: 'AZ001',
      class: 'business',
      pnr: 'ABCDEF',
    },
  })
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
