import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  CommunicationsService,
  SendCommunicationDto,
  QueryCommunicationsDto,
} from './communications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import {
  CommunicationChannel, CommTemplateType,
} from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateTemplateDto {
  @ApiProperty({ enum: CommTemplateType }) @IsEnum(CommTemplateType) type: CommTemplateType;
  @ApiProperty({ enum: CommunicationChannel }) @IsEnum(CommunicationChannel) channel: CommunicationChannel;
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subject?: string;
  @ApiProperty() @IsString() body: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bodyHtml?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsObject() variables?: Record<string, unknown>;
}

class SendWithTemplateDto {
  @ApiProperty() @IsString() to: string;
  @ApiProperty({ description: 'Data for template variables' }) @IsObject() data: Record<string, unknown>;
}

@ApiTags('Communications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'communications', version: '1' })
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}

  @Post('send')
  @RequirePermissions('communications:send')
  @ApiOperation({ summary: 'Send email or WhatsApp message — logs to communications table' })
  send(@Body() dto: SendCommunicationDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.send(user.tenantId, dto, user.sub);
  }

  @Get()
  @RequirePermissions('communications:read')
  @ApiOperation({ summary: 'List all communications (inbox/outbox)' })
  findAll(@Query() query: QueryCommunicationsDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findAll(user.tenantId, query);
  }

  @Get('stats')
  @RequirePermissions('communications:read')
  @ApiOperation({ summary: 'Stats by channel and status' })
  getStats(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getStats(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('communications:read')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findOne(user.tenantId, id);
  }

  // Templates
  @Post('templates')
  @RequirePermissions('communications:create')
  @ApiOperation({ summary: 'Create communication template (Handlebars {{variable}})' })
  createTemplate(@Body() dto: CreateTemplateDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.createTemplate(user.tenantId, dto);
  }

  @Get('templates/list')
  @RequirePermissions('communications:read')
  @ApiOperation({ summary: 'List communication templates' })
  getTemplates(@Query() q: { type?: CommTemplateType; channel?: CommunicationChannel }, @CurrentUser() user: CurrentUserPayload) {
    return this.service.getTemplates(user.tenantId, q.type, q.channel);
  }

  @Post('templates/:id/send')
  @RequirePermissions('communications:send')
  @ApiOperation({ summary: 'Send communication using template — renders {{variables}} with provided data' })
  sendWithTemplate(
    @Param('id') id: string,
    @Body() dto: SendWithTemplateDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.sendWithTemplate(user.tenantId, id, dto.to, dto.data, user.sub);
  }
}
