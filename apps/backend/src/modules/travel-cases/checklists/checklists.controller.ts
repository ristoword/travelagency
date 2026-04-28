import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChecklistsService, CreateChecklistItemDto } from './checklists.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('Travel Cases — Checklists')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'cases/:caseId/checklists', version: '1' })
export class ChecklistsController {
  constructor(private readonly service: ChecklistsService) {}

  @Post()
  @RequirePermissions('cases:update')
  create(@Param('caseId') caseId: string, @Body() dto: CreateChecklistItemDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(user.tenantId, caseId, dto);
  }

  @Get()
  @RequirePermissions('cases:read')
  findAll(@Param('caseId') caseId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findByCaseId(user.tenantId, caseId);
  }

  @Get('progress')
  @RequirePermissions('cases:read')
  @ApiOperation({ summary: 'Get checklist completion progress %' })
  getProgress(@Param('caseId') caseId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.getProgress(user.tenantId, caseId);
  }

  @Post(':id/toggle')
  @RequirePermissions('cases:update')
  @ApiOperation({ summary: 'Toggle checklist item complete/incomplete' })
  toggle(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.toggle(user.tenantId, id, user.sub);
  }

  @Patch(':id')
  @RequirePermissions('cases:update')
  update(@Param('id') id: string, @Body() dto: Partial<CreateChecklistItemDto>, @CurrentUser() user: CurrentUserPayload) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('cases:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(user.tenantId, id);
  }
}
