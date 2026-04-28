import {
  Controller, Get, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CustomerPreferencesService, UpsertPreferenceDto } from './customer-preferences.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('CRM — Customer Preferences')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'clients/:clientId/preferences', version: '1' })
export class CustomerPreferencesController {
  constructor(private readonly service: CustomerPreferencesService) {}

  @Get()
  @RequirePermissions('clients:read')
  @ApiOperation({ summary: 'Get all preferences for a client (as key-value map)' })
  findAll(@Param('clientId') clientId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findAll(user.tenantId, clientId);
  }

  @Put()
  @RequirePermissions('clients:update')
  @ApiOperation({ summary: 'Upsert a preference' })
  upsert(
    @Param('clientId') clientId: string,
    @Body() dto: UpsertPreferenceDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.upsert(user.tenantId, clientId, dto);
  }

  @Put('bulk')
  @RequirePermissions('clients:update')
  @ApiOperation({ summary: 'Bulk upsert preferences' })
  upsertMany(
    @Param('clientId') clientId: string,
    @Body() body: { preferences: UpsertPreferenceDto[] },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.upsertMany(user.tenantId, clientId, body.preferences);
  }

  @Delete(':key')
  @RequirePermissions('clients:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a preference by key' })
  remove(
    @Param('clientId') clientId: string,
    @Param('key') key: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.remove(user.tenantId, clientId, key);
  }
}
