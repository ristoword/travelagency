import {
  Controller, Get, Post, Body, Patch, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProposalsService, CreateProposalDto } from './proposals.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('Sales — Proposals')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'proposals', version: '1' })
export class ProposalsController {
  constructor(private readonly service: ProposalsService) {}

  @Post('quotation/:quotationId')
  @RequirePermissions('quotations:create')
  @ApiOperation({ summary: 'Create proposal for a quotation' })
  create(
    @Param('quotationId') quotationId: string,
    @Body() dto: CreateProposalDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(user.tenantId, quotationId, dto, user.sub);
  }

  @Get()
  @RequirePermissions('quotations:read')
  @ApiOperation({ summary: 'List all proposals' })
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.service.findAll(user.tenantId);
  }

  @Get('quotation/:quotationId')
  @RequirePermissions('quotations:read')
  @ApiOperation({ summary: 'Get proposal for a quotation' })
  findByQuotation(@Param('quotationId') qId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findByQuotation(user.tenantId, qId);
  }

  @Patch(':id')
  @RequirePermissions('quotations:update')
  @ApiOperation({ summary: 'Update proposal content' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateProposalDto>, @CurrentUser() user: CurrentUserPayload) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Post(':id/send')
  @RequirePermissions('quotations:update')
  @ApiOperation({ summary: 'Send proposal → marks quotation as SENT' })
  send(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.send(user.tenantId, id);
  }

  @Post(':id/accept')
  @RequirePermissions('quotations:approve')
  @ApiOperation({ summary: 'Accept proposal → marks quotation as ACCEPTED' })
  accept(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.accept(user.tenantId, id, user.sub);
  }

  @Post(':id/reject')
  @RequirePermissions('quotations:update')
  @ApiOperation({ summary: 'Reject proposal → marks quotation as REJECTED' })
  reject(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.reject(user.tenantId, id, user.sub);
  }
}
