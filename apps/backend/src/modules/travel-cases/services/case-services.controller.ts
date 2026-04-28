import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CaseServicesService, CreateCaseServiceDto } from './case-services.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { IsOptional, IsString } from 'class-validator';

class ConfirmServiceDto { @IsOptional() @IsString() providerRef?: string; }

@ApiTags('Travel Cases — Services')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'cases/:caseId/services', version: '1' })
export class CaseServicesController {
  constructor(private readonly service: CaseServicesService) {}

  @Post()
  @RequirePermissions('cases:update')
  @ApiOperation({ summary: 'Add service to case (flight, hotel, transfer...)' })
  create(@Param('caseId') caseId: string, @Body() dto: CreateCaseServiceDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(user.tenantId, caseId, dto);
  }

  @Get()
  @RequirePermissions('cases:read')
  @ApiOperation({ summary: 'List services for case (sorted by service date)' })
  findAll(@Param('caseId') caseId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findByCaseId(user.tenantId, caseId);
  }

  @Patch(':id')
  @RequirePermissions('cases:update')
  update(@Param('id') id: string, @Body() dto: Partial<CreateCaseServiceDto>, @CurrentUser() user: CurrentUserPayload) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Post(':id/confirm')
  @RequirePermissions('cases:update')
  @ApiOperation({ summary: 'Confirm a service (set status to CONFIRMED)' })
  confirm(@Param('id') id: string, @Body() dto: ConfirmServiceDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.confirm(user.tenantId, id, dto.providerRef);
  }

  @Delete(':id')
  @RequirePermissions('cases:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(user.tenantId, id);
  }
}
