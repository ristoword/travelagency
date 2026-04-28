import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { QueryCasesDto } from './dto/query-cases.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { CaseStatus, NoteType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class UpdateStatusDto {
  @IsEnum(CaseStatus) status: CaseStatus;
  @IsOptional() @IsString() notes?: string;
}
class AddNoteDto {
  @IsString() content: string;
  @IsOptional() @IsEnum(NoteType) type?: NoteType;
  @IsOptional() @IsBoolean() isPrivate?: boolean;
}

@ApiTags('Travel Cases — Cases')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'cases', version: '1' })
export class CasesController {
  constructor(private readonly service: CasesService) {}

  @Post()
  @RequirePermissions('cases:create')
  @ApiOperation({ summary: 'Create travel case (auto-number PRA-YYYY-NNNN, default checklist)' })
  create(@Body() dto: CreateCaseDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(user.tenantId, dto, user.sub);
  }

  @Get()
  @RequirePermissions('cases:read')
  @ApiOperation({ summary: 'List travel cases' })
  findAll(@Query() query: QueryCasesDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findAll(user.tenantId, query);
  }

  @Get('stats')
  @RequirePermissions('cases:read')
  @ApiOperation({ summary: 'Cases stats and upcoming departures' })
  getStats(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getStats(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('cases:read')
  @ApiOperation({ summary: 'Get full case detail (passengers, itinerary, services, checklists)' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('cases:update')
  update(@Param('id') id: string, @Body() dto: Partial<CreateCaseDto>, @CurrentUser() user: CurrentUserPayload) {
    return this.service.update(user.tenantId, id, dto, user.sub);
  }

  @Patch(':id/status')
  @RequirePermissions('cases:update')
  @ApiOperation({ summary: 'Update case status with history tracking' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.updateStatus(user.tenantId, id, dto.status, dto.notes, user.sub);
  }

  @Get(':id/notes')
  @RequirePermissions('cases:read')
  getNotes(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.getNotes(user.tenantId, id);
  }

  @Post(':id/notes')
  @RequirePermissions('cases:update')
  addNote(@Param('id') id: string, @Body() dto: AddNoteDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.addNote(user.tenantId, id, dto.content, dto.type, dto.isPrivate, user.sub);
  }

  @Delete(':id')
  @RequirePermissions('cases:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(user.tenantId, id, user.sub);
  }
}
