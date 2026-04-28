import {
  IsString, IsOptional, IsEnum, IsDateString, IsUUID, IsInt, Min, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClientDocumentType } from '@prisma/client';

export class CreateClientDocumentDto {
  @ApiProperty({ enum: ClientDocumentType, example: ClientDocumentType.PASSPORT })
  @IsEnum(ClientDocumentType)
  type: ClientDocumentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'ID passeggero pratica viaggio' })
  @IsOptional()
  @IsUUID()
  passengerId?: string;

  @ApiPropertyOptional({ example: 'AA1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentNumber?: string;

  @ApiPropertyOptional({ example: 'Questura di Roma' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuedBy?: string;

  @ApiPropertyOptional({ example: '2020-03-10' })
  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @ApiPropertyOptional({ example: '2030-03-10' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 'IT' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  nationality?: string;

  @ApiPropertyOptional({ example: 'Giuseppe' })
  @IsOptional()
  @IsString()
  holderFirstName?: string;

  @ApiPropertyOptional({ example: 'Ferrari' })
  @IsOptional()
  @IsString()
  holderLastName?: string;

  @ApiPropertyOptional({ example: '1975-05-20' })
  @IsOptional()
  @IsDateString()
  holderBirthDate?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/docs/passport.jpg' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileKey?: string;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ example: 512000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
