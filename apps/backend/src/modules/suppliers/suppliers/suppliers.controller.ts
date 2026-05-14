import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UpdateScoreDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 5 }) @IsOptional() @IsNumber() @Min(1) @Max(5) qualityScore?: number;
  @ApiPropertyOptional({ minimum: 1, maximum: 5 }) @IsOptional() @IsNumber() @Min(1) @Max(5) reliabilityScore?: number;
  @ApiPropertyOptional({ minimum: 1, maximum: 5 }) @IsOptional() @IsNumber() @Min(1) @Max(5) priceScore?: number;
}
class AddContactDto {
  @ApiProperty() @IsString() firstName: string;
  @ApiProperty() @IsString() lastName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
}
class ReportIssueDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() description: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
}

@ApiTags('Suppliers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'suppliers', version: '1' })
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Post()
  @RequirePermissions('suppliers:create')
  @ApiOperation({ summary: 'Create supplier' })
  create(@Body() dto: CreateSupplierDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(user.tenantId, dto, user.sub);
  }

  @Get()
  @RequirePermissions('suppliers:read')
  @ApiOperation({ summary: 'List suppliers with filters' })
  findAll(@Query() query: QuerySuppliersDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findAll(user.tenantId, query);
  }

  @Get('stats')
  @RequirePermissions('suppliers:read')
  @ApiOperation({ summary: 'Supplier stats by type/status + top suppliers' })
  getStats(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getStats(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('suppliers:read')
  @ApiOperation({ summary: 'Get full supplier detail (contracts, commissions, issues)' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('suppliers:update')
  update(@Param('id') id: string, @Body() dto: Partial<CreateSupplierDto>, @CurrentUser() user: CurrentUserPayload) {
    return this.service.update(user.tenantId, id, dto, user.sub);
  }

  @Patch(':id/score')
  @RequirePermissions('suppliers:update')
  @ApiOperation({ summary: 'Update supplier score (quality, reliability, price — 1-5)' })
  updateScore(@Param('id') id: string, @Body() dto: UpdateScoreDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.updateScore(user.tenantId, id, dto);
  }

  @Post(':id/contacts')
  @RequirePermissions('suppliers:update')
  @ApiOperation({ summary: 'Add contact to supplier' })
  addContact(@Param('id') id: string, @Body() dto: AddContactDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.addContact(user.tenantId, id, dto);
  }

  @Post(':id/issues')
  @RequirePermissions('suppliers:update')
  @ApiOperation({ summary: 'Report issue with supplier' })
  reportIssue(@Param('id') id: string, @Body() dto: ReportIssueDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.reportIssue(user.tenantId, id, dto, user.sub);
  }

  @Delete(':id')
  @RequirePermissions('suppliers:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(user.tenantId, id, user.sub);
  }
}
