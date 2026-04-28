import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@agenziaroma.it' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    example: 'agenzia-roma',
    description: 'Tenant slug (optional if set via header)',
  })
  @IsOptional()
  @IsString()
  tenantSlug?: string;
}
