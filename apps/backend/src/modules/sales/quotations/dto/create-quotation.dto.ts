import {
  IsString, IsOptional, IsEnum, IsInt, IsNumber,
  IsDateString, IsUUID, IsArray, ValidateNested,
  MaxLength, Min, IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuotationItemType } from '@prisma/client';

export class CreateQuotationItemDto {
  @ApiProperty({ enum: QuotationItemType, example: QuotationItemType.FLIGHT })
  @IsEnum(QuotationItemType)
  type: QuotationItemType;

  @ApiProperty({ example: 'Volo andata/ritorno Roma → Malé, Business Class' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ example: 'Alitalia AZ001 — partenza 15 Giu 10:30' })
  @IsOptional()
  @IsString()
  details?: string;

  @ApiProperty({ example: 2, default: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 1800, description: 'Prezzo unitario al cliente (€)' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ example: 1400, description: 'Costo netto dal fornitore (€)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  supplierCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateQuotationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @ApiPropertyOptional({ example: 'Maldive' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  destination?: string;

  @ApiPropertyOptional({ example: '2025-06-15' })
  @IsOptional()
  @IsDateString()
  departureDate?: string;

  @ApiPropertyOptional({ example: '2025-06-29' })
  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfPeople?: number;

  @ApiPropertyOptional({ example: 'honeymoon' })
  @IsOptional()
  @IsString()
  travelType?: string;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'percentage | fixed',
    example: 'percentage',
  })
  @IsOptional()
  @IsString()
  discountType?: string;

  @ApiPropertyOptional({ example: 5, description: 'Valore sconto (% o €)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional({ example: '2025-05-15', description: 'Data scadenza preventivo' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ example: 'Preventivo personalizzato per viaggio di nozze alle Maldive' })
  @IsOptional()
  @IsString()
  clientNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({ example: 'Validità 30 giorni. Prezzi soggetti a disponibilità.' })
  @IsOptional()
  @IsString()
  terms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ type: [CreateQuotationItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items?: CreateQuotationItemDto[];
}
