import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService, CreatePaymentDto, QueryPaymentsDto } from './payments.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('Accounting — Payments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post()
  @RequirePermissions('invoices:create')
  @ApiOperation({ summary: 'Record a standalone payment (incoming or outgoing)' })
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('invoices:read')
  @ApiOperation({ summary: 'List payments with filters' })
  findAll(@Query() query: QueryPaymentsDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findAll(user.tenantId, query);
  }

  @Get('cash-flow')
  @RequirePermissions('analytics:read')
  @ApiOperation({ summary: 'Cash flow stats: monthly/yearly in/out + breakdown by payment method' })
  getCashFlow(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getCashFlowStats(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('invoices:read')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findOne(user.tenantId, id);
  }
}
