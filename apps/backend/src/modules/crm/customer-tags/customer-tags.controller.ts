import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CustomerTagsService } from './customer-tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { TagType } from '@prisma/client';
import { IsOptional, IsEnum } from 'class-validator';

class QueryTagsDto {
  @IsOptional() @IsEnum(TagType) type?: TagType;
}

@ApiTags('CRM — Tags')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'tags', version: '1' })
export class CustomerTagsController {
  constructor(private readonly tagsService: CustomerTagsService) {}

  @Post()
  @RequirePermissions('clients:create')
  @ApiOperation({ summary: 'Create a tag' })
  create(@Body() dto: CreateTagDto, @CurrentUser() user: CurrentUserPayload) {
    return this.tagsService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('clients:read')
  @ApiOperation({ summary: 'List all tags' })
  @ApiQuery({ name: 'type', enum: TagType, required: false })
  findAll(@Query() query: QueryTagsDto, @CurrentUser() user: CurrentUserPayload) {
    return this.tagsService.findAll(user.tenantId, query.type);
  }

  @Get(':id')
  @RequirePermissions('clients:read')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.tagsService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('clients:update')
  update(@Param('id') id: string, @Body() dto: Partial<CreateTagDto>, @CurrentUser() user: CurrentUserPayload) {
    return this.tagsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('clients:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.tagsService.remove(user.tenantId, id);
  }
}
