import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class PriceSuggestionDto {
  @ApiProperty({ example: 1400 }) @IsNumber() @Min(0) costPrice: number;
  @ApiProperty({ example: 20 }) @IsNumber() @Min(1) @Max(99) targetMarginPercent: number;
}

@ApiTags('Sales — Pricing & Margins')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'pricing', version: '1' })
export class PricingController {
  constructor(private readonly service: PricingService) {}

  @Post('suggest')
  @RequirePermissions('quotations:read')
  @ApiOperation({ summary: 'Calculate suggested selling price from cost + target margin %' })
  suggest(@Body() dto: PriceSuggestionDto) {
    return this.service.calculateSellingPrice(dto.costPrice, dto.targetMarginPercent);
  }

  @Get('quotation/:id/margin')
  @RequirePermissions('quotations:read')
  @ApiOperation({ summary: 'Full margin analysis for a quotation (by item type)' })
  analyzeQuotation(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.analyzeQuotation(user.tenantId, id);
  }

  @Get('stats')
  @RequirePermissions('analytics:read')
  @ApiOperation({ summary: 'Tenant-level margin analytics by service type' })
  getStats(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getTenantMarginStats(user.tenantId);
  }
}
