import { IsString, IsOptional, IsEnum, MaxLength, Matches, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TagType } from '@prisma/client';

export class CreateTagDto {
  @ApiProperty({ example: 'VIP' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: '#f59e0b', description: 'HEX color' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid HEX color (e.g. #f59e0b)' })
  color?: string;

  @ApiPropertyOptional({ enum: TagType, default: TagType.GENERAL })
  @IsOptional()
  @IsEnum(TagType)
  type?: TagType;
}
