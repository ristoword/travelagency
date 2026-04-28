import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OpportunitiesService, QueryOpportunitiesDto } from './opportunities.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('Sales — Opportunities')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'opportunities', version: '1' })
export class OpportunitiesController {
  constructor(private readonly service: OpportunitiesService) {}

  @Post()
  @RequirePermissions('quotations:create')
  @ApiOperation({ summary: 'Create opportunity' })
  create(@Body() dto: CreateOpportunityDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(user.tenantId, dto, user.sub);
  }

  @Get()
  @RequirePermissions('quotations:read')
  @ApiOperation({ summary: 'List opportunities' })
  findAll(@Query() query: QueryOpportunitiesDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findAll(user.tenantId, query);
  }

  @Get('stats/pipeline')
  @RequirePermissions('quotations:read')
  @ApiOperation({ summary: 'Sales pipeline stats' })
  getPipelineStats(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getPipelineStats(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('quotations:read')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('quotations:update')
  update(@Param('id') id: string, @Body() dto: Partial<CreateOpportunityDto>, @CurrentUser() user: CurrentUserPayload) {
    return this.service.update(user.tenantId, id, dto, user.sub);
  }

  @Delete(':id')
  @RequirePermissions('quotations:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(user.tenantId, id, user.sub);
  }
}
