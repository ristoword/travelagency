import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { NoteType } from '@prisma/client';
import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class AddNoteDto {
  @ApiPropertyOptional() @IsString() content: string;
  @ApiPropertyOptional({ enum: NoteType }) @IsOptional() @IsEnum(NoteType) type?: NoteType;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrivate?: boolean;
}

@ApiTags('CRM — Leads')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'leads', version: '1' })
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @RequirePermissions('leads:create')
  @ApiOperation({ summary: 'Create a new lead' })
  create(@Body() dto: CreateLeadDto, @CurrentUser() user: CurrentUserPayload) {
    return this.leadsService.create(user.tenantId, dto, user.sub);
  }

  @Get()
  @RequirePermissions('leads:read')
  @ApiOperation({ summary: 'List leads with filters & pagination' })
  findAll(@Query() query: QueryLeadsDto, @CurrentUser() user: CurrentUserPayload) {
    return this.leadsService.findAll(user.tenantId, query);
  }

  @Get('stats/pipeline')
  @RequirePermissions('leads:read')
  @ApiOperation({ summary: 'Lead pipeline statistics' })
  getPipelineStats(@CurrentUser() user: CurrentUserPayload) {
    return this.leadsService.getPipelineStats(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('leads:read')
  @ApiOperation({ summary: 'Get lead detail' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.leadsService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('leads:update')
  @ApiOperation({ summary: 'Update lead' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.leadsService.update(user.tenantId, id, dto, user.sub);
  }

  @Post(':id/convert')
  @RequirePermissions('leads:convert')
  @ApiOperation({ summary: 'Convert lead to client' })
  convert(
    @Param('id') id: string,
    @Body() dto: ConvertLeadDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.leadsService.convert(user.tenantId, id, dto, user.sub);
  }

  @Delete(':id')
  @RequirePermissions('leads:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete lead' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.leadsService.remove(user.tenantId, id, user.sub);
  }

  // Notes
  @Get(':id/notes')
  @RequirePermissions('leads:read')
  @ApiOperation({ summary: 'List lead notes' })
  getNotes(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.leadsService.getNotes(user.tenantId, id);
  }

  @Post(':id/notes')
  @RequirePermissions('leads:update')
  @ApiOperation({ summary: 'Add note to lead' })
  addNote(
    @Param('id') id: string,
    @Body() dto: AddNoteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.leadsService.addNote(user.tenantId, id, dto.content, dto.type, dto.isPrivate, user.sub);
  }

  // Tags
  @Post(':id/tags/:tagId')
  @RequirePermissions('leads:update')
  @ApiOperation({ summary: 'Add tag to lead' })
  addTag(
    @Param('id') id: string,
    @Param('tagId') tagId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.leadsService.addTag(user.tenantId, id, tagId);
  }

  @Delete(':id/tags/:tagId')
  @RequirePermissions('leads:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove tag from lead' })
  removeTag(
    @Param('id') id: string,
    @Param('tagId') tagId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.leadsService.removeTag(user.tenantId, id, tagId);
  }
}
