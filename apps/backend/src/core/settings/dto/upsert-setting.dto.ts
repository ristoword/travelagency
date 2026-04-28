import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertSettingDto {
  @ApiProperty({ example: 'default_currency' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key: string;

  @ApiProperty({
    example: 'EUR',
    description: 'Value (any JSON-serializable value)',
  })
  @IsNotEmpty()
  value: unknown;
}
