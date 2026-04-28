import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditLogService, AuditLogQuery } from './audit-log.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Audit Log')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'audit-log', version: '1' })
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'List audit log entries for current tenant' })
  findAll(
    @Query() query: AuditLogQuery,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.auditLogService.findAll(user.tenantId, query);
  }

  @Get('stats')
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'Get audit log statistics' })
  getStats(@CurrentUser() user: CurrentUserPayload) {
    return this.auditLogService.getStats(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'Get single audit log entry' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.auditLogService.findOne(user.tenantId, id);
  }
}
