import {
  Controller, Get, Post, Body, Patch, Param, Query,
  UseGuards, DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SupplierContractsService, CreateContractDto } from './supplier-contracts.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AddCommissionDto {
  @ApiProperty({ example: 'PERCENTAGE' }) @IsString() type: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serviceType?: string;
  @ApiProperty({ example: 10 }) @IsNumber() @Min(0) rate: number;
  @ApiPropertyOptional() @IsOptional() @IsString() validFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() validUntil?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

@ApiTags('Suppliers — Contracts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'suppliers/:supplierId/contracts', version: '1' })
export class SupplierContractsController {
  constructor(private readonly service: SupplierContractsService) {}

  @Post()
  @RequirePermissions('suppliers:update')
  @ApiOperation({ summary: 'Add contract to supplier' })
  create(@Param('supplierId') supplierId: string, @Body() dto: CreateContractDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(user.tenantId, supplierId, dto);
  }

  @Get()
  @RequirePermissions('suppliers:read')
  @ApiOperation({ summary: 'List contracts for supplier' })
  findAll(@Param('supplierId') supplierId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findBySupplierId(user.tenantId, supplierId);
  }

  @Get('expiring')
  @RequirePermissions('suppliers:read')
  @ApiOperation({ summary: 'Contracts expiring within N days' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getExpiring(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.getExpiringContracts(user.tenantId, days);
  }

  @Get(':id')
  @RequirePermissions('suppliers:read')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('suppliers:update')
  update(@Param('id') id: string, @Body() dto: Partial<CreateContractDto>, @CurrentUser() user: CurrentUserPayload) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Post(':id/commissions')
  @RequirePermissions('suppliers:update')
  @ApiOperation({ summary: 'Add commission rate to contract' })
  addCommission(@Param('id') id: string, @Body() dto: AddCommissionDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.addCommission(user.tenantId, id, dto);
  }
}
