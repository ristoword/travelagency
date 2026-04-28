import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ItinerariesService, CreateItineraryDayDto } from './itineraries.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BulkItineraryDto { @IsArray() @ValidateNested({ each: true }) @Type(() => CreateItineraryDayDto) days: CreateItineraryDayDto[]; }

@ApiTags('Travel Cases — Itinerary')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'cases/:caseId/itinerary', version: '1' })
export class ItinerariesController {
  constructor(private readonly service: ItinerariesService) {}

  @Post()
  @RequirePermissions('cases:update')
  @ApiOperation({ summary: 'Add single itinerary day' })
  create(@Param('caseId') caseId: string, @Body() dto: CreateItineraryDayDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(user.tenantId, caseId, dto);
  }

  @Post('bulk')
  @RequirePermissions('cases:update')
  @ApiOperation({ summary: 'Replace entire itinerary with bulk days' })
  createMany(@Param('caseId') caseId: string, @Body() dto: BulkItineraryDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.createMany(user.tenantId, caseId, dto.days);
  }

  @Get()
  @RequirePermissions('cases:read')
  @ApiOperation({ summary: 'Get full itinerary for case' })
  findAll(@Param('caseId') caseId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findByCaseId(user.tenantId, caseId);
  }

  @Patch(':id')
  @RequirePermissions('cases:update')
  update(@Param('id') id: string, @Body() dto: Partial<CreateItineraryDayDto>, @CurrentUser() user: CurrentUserPayload) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('cases:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(user.tenantId, id);
  }
}
