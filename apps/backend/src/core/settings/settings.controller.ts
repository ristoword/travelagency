import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpsertSettingDto } from './dto/upsert-setting.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Settings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'settings', version: '1' })
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'Get all settings for current tenant (as key-value map)' })
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.settingsService.findAll(user.tenantId);
  }

  @Get(':key')
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'Get a specific setting by key' })
  findOne(
    @Param('key') key: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.settingsService.findOne(user.tenantId, key);
  }

  @Put()
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Create or update a setting' })
  upsert(@Body() dto: UpsertSettingDto, @CurrentUser() user: CurrentUserPayload) {
    return this.settingsService.upsert(user.tenantId, dto);
  }

  @Put('bulk')
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Bulk upsert multiple settings' })
  upsertMany(
    @Body() body: { settings: UpsertSettingDto[] },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.settingsService.upsertMany(user.tenantId, body.settings);
  }

  @Delete(':key')
  @RequirePermissions('settings:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a setting' })
  remove(@Param('key') key: string, @CurrentUser() user: CurrentUserPayload) {
    return this.settingsService.remove(user.tenantId, key);
  }
}
