import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QuotationsService } from './quotations.service';
import { CreateQuotationDto, CreateQuotationItemDto } from './dto/create-quotation.dto';
import { QueryQuotationsDto } from './dto/query-quotations.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { QuotationStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

class UpdateStatusDto { @IsEnum(QuotationStatus) status: QuotationStatus; }

@ApiTags('Sales — Quotations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'quotations', version: '1' })
export class QuotationsController {
  constructor(private readonly service: QuotationsService) {}

  @Post()
  @RequirePermissions('quotations:create')
  @ApiOperation({ summary: 'Create quotation with items — number auto-generated (PRV-YYYY-NNNN)' })
  create(@Body() dto: CreateQuotationDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(user.tenantId, dto, user.sub);
  }

  @Get()
  @RequirePermissions('quotations:read')
  @ApiOperation({ summary: 'List quotations with filters' })
  findAll(@Query() query: QueryQuotationsDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findAll(user.tenantId, query);
  }

  @Get('stats')
  @RequirePermissions('quotations:read')
  @ApiOperation({ summary: 'Quotation stats and conversion rate' })
  getStats(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getStats(user.tenantId);
  }

  @Get('number/:number')
  @RequirePermissions('quotations:read')
  @ApiOperation({ summary: 'Get quotation by number (PRV-2025-0001)' })
  findByNumber(@Param('number') number: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findByNumber(user.tenantId, number);
  }

  @Get(':id')
  @RequirePermissions('quotations:read')
  @ApiOperation({ summary: 'Get quotation detail with items' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('quotations:update')
  @ApiOperation({ summary: 'Update quotation (recalculates financials)' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateQuotationDto>, @CurrentUser() user: CurrentUserPayload) {
    return this.service.update(user.tenantId, id, dto, user.sub);
  }

  @Patch(':id/status')
  @RequirePermissions('quotations:update')
  @ApiOperation({ summary: 'Update quotation status (DRAFT→SENT→VIEWED→ACCEPTED/REJECTED)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.updateStatus(user.tenantId, id, dto.status, user.sub);
  }

  @Post(':id/items')
  @RequirePermissions('quotations:update')
  @ApiOperation({ summary: 'Add item to quotation (auto-recalculates)' })
  addItem(@Param('id') id: string, @Body() item: CreateQuotationItemDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.addItem(user.tenantId, id, item, user.sub);
  }

  @Delete(':id/items/:itemId')
  @RequirePermissions('quotations:update')
  @ApiOperation({ summary: 'Remove item from quotation (auto-recalculates)' })
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.removeItem(user.tenantId, id, itemId);
  }

  @Delete(':id')
  @RequirePermissions('quotations:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(user.tenantId, id, user.sub);
  }
}
