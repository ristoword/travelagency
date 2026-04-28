import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({ example: 'clients', description: 'Resource name' })
  @IsString()
  @MaxLength(100)
  resource: string;

  @ApiProperty({
    example: 'create',
    description: 'Action: create | read | update | delete | export | import',
  })
  @IsString()
  @MaxLength(50)
  action: string;

  @ApiPropertyOptional({ example: 'Create new clients in the CRM' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
