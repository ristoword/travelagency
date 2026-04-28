import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DocumentTemplatesService, CreateTemplateDto } from './document-templates.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { TemplateType } from '@prisma/client';
import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class RenderTemplateDto { @ApiProperty({ description: 'Data object to interpolate' }) @IsObject() data: Record<string, unknown>; }

@ApiTags('Documents — Templates')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'document-templates', version: '1' })
export class DocumentTemplatesController {
  constructor(private readonly service: DocumentTemplatesService) {}

  @Post()
  @RequirePermissions('documents:create')
  @ApiOperation({ summary: 'Create document template with {{variable}} placeholders' })
  create(@Body() dto: CreateTemplateDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('documents:read')
  @ApiOperation({ summary: 'List templates (optionally filter by type)' })
  @ApiQuery({ name: 'type', enum: TemplateType, required: false })
  findAll(@Query('type') type: TemplateType, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findAll(user.tenantId, type);
  }

  @Get('default/:type')
  @RequirePermissions('documents:read')
  @ApiOperation({ summary: 'Get default template for a type' })
  findDefault(@Param('type') type: TemplateType, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findDefault(user.tenantId, type);
  }

  @Get(':id')
  @RequirePermissions('documents:read')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findOne(user.tenantId, id);
  }

  @Post(':id/render')
  @RequirePermissions('documents:read')
  @ApiOperation({ summary: 'Render template with data — returns HTML string ready for PDF' })
  render(@Param('id') id: string, @Body() dto: RenderTemplateDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.render(user.tenantId, id, dto.data).then(html => ({ html }));
  }

  @Patch(':id')
  @RequirePermissions('documents:create')
  update(@Param('id') id: string, @Body() dto: Partial<CreateTemplateDto>, @CurrentUser() user: CurrentUserPayload) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('documents:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate template (soft delete)' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(user.tenantId, id);
  }
}
