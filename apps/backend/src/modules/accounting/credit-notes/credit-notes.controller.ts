import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CreditNotesService, CreateCreditNoteDto } from './credit-notes.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('Accounting — Credit Notes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'credit-notes', version: '1' })
export class CreditNotesController {
  constructor(private readonly service: CreditNotesService) {}

  @Post()
  @RequirePermissions('invoices:create')
  @ApiOperation({ summary: 'Create credit note NC-YYYY-NNNN (linked to invoice or standalone)' })
  create(@Body() dto: CreateCreditNoteDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('invoices:read')
  @ApiOperation({ summary: 'List all credit notes' })
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.service.findAll(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('invoices:read')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findOne(user.tenantId, id);
  }

  @Post(':id/issue')
  @RequirePermissions('invoices:update')
  @ApiOperation({ summary: 'Issue credit note: DRAFT → ISSUED' })
  issue(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.issue(user.tenantId, id);
  }

  @Post(':id/apply')
  @RequirePermissions('invoices:update')
  @ApiOperation({ summary: 'Apply credit note → reduces linked invoice balance' })
  apply(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.apply(user.tenantId, id);
  }
}
