import { IsOptional, IsUUID, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConvertLeadDto {
  @ApiPropertyOptional({
    description: 'Existing client ID — if omitted, a new client is created from lead data',
  })
  @IsOptional()
  @IsUUID()
  existingClientId?: string;

  @ApiPropertyOptional({ example: 'Lead convertito dopo chiamata di chiusura' })
  @IsOptional()
  @IsString()
  notes?: string;
}
