import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PassengersService, CreatePassengerDto } from './passengers.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('Travel Cases — Passengers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'cases/:caseId/passengers', version: '1' })
export class PassengersController {
  constructor(private readonly service: PassengersService) {}

  @Post()
  @RequirePermissions('cases:update')
  @ApiOperation({ summary: 'Add passenger to case' })
  create(@Param('caseId') caseId: string, @Body() dto: CreatePassengerDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(user.tenantId, caseId, dto);
  }

  @Get()
  @RequirePermissions('cases:read')
  @ApiOperation({ summary: 'List passengers for case' })
  findAll(@Param('caseId') caseId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findByCaseId(user.tenantId, caseId);
  }

  @Get(':id')
  @RequirePermissions('cases:read')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('cases:update')
  update(@Param('id') id: string, @Body() dto: Partial<CreatePassengerDto>, @CurrentUser() user: CurrentUserPayload) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('cases:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(user.tenantId, id);
  }
}
