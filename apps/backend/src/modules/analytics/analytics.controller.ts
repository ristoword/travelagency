import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class PeriodDto {
  @ApiPropertyOptional({ enum: ['1M', '3M', '6M', '12M'], default: '6M' })
  @IsOptional()
  @IsEnum(['1M', '3M', '6M', '12M'])
  period?: '1M' | '3M' | '6M' | '12M';
}

@ApiTags('Analytics')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'analytics', version: '1' })
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermissions('analytics:read')
  @ApiOperation({
    summary: 'Main dashboard KPIs — revenue, margins, leads, cases, alerts',
    description: 'Returns all KPIs needed for the main dashboard: revenue this/last month + YTD, margins, lead conversion rate, active cases, client count, overdue invoices.',
  })
  getDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getDashboardKpis(user.tenantId);
  }

  @Get('sales')
  @RequirePermissions('analytics:read')
  @ApiOperation({ summary: 'Sales analytics — quotations by status, monthly revenue, top destinations, top agents' })
  @ApiQuery({ name: 'period', enum: ['1M', '3M', '6M', '12M'], required: false })
  getSales(@Query() query: PeriodDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.getSalesAnalytics(user.tenantId, query.period ?? '6M');
  }

  @Get('margins')
  @RequirePermissions('analytics:read')
  @ApiOperation({ summary: 'Margin analytics — by service type, by supplier, booking vs quotation' })
  getMargins(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getMarginAnalytics(user.tenantId);
  }

  @Get('clients')
  @RequirePermissions('analytics:read')
  @ApiOperation({ summary: 'Client analytics — by source/type, top spenders, VIP stats, acquisition trend' })
  getClients(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getClientAnalytics(user.tenantId);
  }

  @Get('leads')
  @RequirePermissions('analytics:read')
  @ApiOperation({ summary: 'Lead analytics — pipeline by status/source/priority, conversion by agent' })
  getLeads(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getLeadAnalytics(user.tenantId);
  }

  @Get('forecasts')
  @RequirePermissions('analytics:read')
  @ApiOperation({ summary: 'Revenue forecast — 6 months historical trend + 3 months projection (linear regression)' })
  getForecasts(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getForecasts(user.tenantId);
  }
}
