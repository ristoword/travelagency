import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CustomerHistoryService, QueryHistoryDto } from './customer-history.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('CRM — History')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'history', version: '1' })
export class CustomerHistoryController {
  constructor(private readonly service: CustomerHistoryService) {}

  @Get('client/:clientId')
  @RequirePermissions('clients:read')
  @ApiOperation({ summary: 'Get full timeline for a client' })
  findByClient(
    @Param('clientId') clientId: string,
    @Query() query: QueryHistoryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.findByClient(user.tenantId, clientId, query);
  }

  @Get('lead/:leadId')
  @RequirePermissions('leads:read')
  @ApiOperation({ summary: 'Get full timeline for a lead' })
  findByLead(@Param('leadId') leadId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findByLead(user.tenantId, leadId);
  }
}
