import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { PaymentMethod } from '@prisma/client';
import { IsNumber, IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class RecordPaymentDto {
  @ApiProperty({ example: 5820 }) @IsNumber() @Min(0.01) amount: number;
  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) method: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional({ example: '2025-05-28' }) @IsOptional() @IsString() paidAt?: string;
}

@ApiTags('Accounting — Invoices')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'invoices', version: '1' })
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Post()
  @RequirePermissions('invoices:create')
  @ApiOperation({ summary: 'Create invoice — auto-number FT/PRF/RC-YYYY-NNNN, VAT calculated' })
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(user.tenantId, dto, user.sub);
  }

  @Get()
  @RequirePermissions('invoices:read')
  @ApiOperation({ summary: 'List invoices (filter by status, type, client, date range, overdue)' })
  findAll(@Query() query: QueryInvoicesDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findAll(user.tenantId, query);
  }

  @Get('stats')
  @RequirePermissions('invoices:read')
  @ApiOperation({ summary: 'Invoice stats: by status, totals, overdue amount' })
  getStats(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getStats(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('invoices:read')
  @ApiOperation({ summary: 'Get full invoice detail with items, payments, credit notes' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('invoices:update')
  update(@Param('id') id: string, @Body() dto: Partial<CreateInvoiceDto>, @CurrentUser() user: CurrentUserPayload) {
    return this.service.update(user.tenantId, id, dto, user.sub);
  }

  @Post(':id/issue')
  @RequirePermissions('invoices:update')
  @ApiOperation({ summary: 'Issue invoice: DRAFT → ISSUED, sets issuedAt to today' })
  issue(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.issue(user.tenantId, id, user.sub);
  }

  @Post(':id/mark-sent')
  @RequirePermissions('invoices:update')
  @ApiOperation({ summary: 'Mark invoice as sent to client' })
  markSent(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.markSent(user.tenantId, id);
  }

  @Post(':id/record-payment')
  @RequirePermissions('invoices:update')
  @ApiOperation({ summary: 'Record payment — auto updates paidAmount, balanceDue and status' })
  recordPayment(@Param('id') id: string, @Body() dto: RecordPaymentDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.recordPayment(user.tenantId, id, dto.amount, dto.method, dto.reference, dto.paidAt);
  }

  @Post(':id/cancel')
  @RequirePermissions('invoices:delete')
  @ApiOperation({ summary: 'Cancel invoice' })
  cancel(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.cancel(user.tenantId, id, user.sub);
  }

  @Delete(':id')
  @RequirePermissions('invoices:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete DRAFT invoice' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(user.tenantId, id);
  }
}
