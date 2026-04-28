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
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
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

@ApiTags('CRM — Clients')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'clients', version: '1' })
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @RequirePermissions('clients:create')
  @ApiOperation({ summary: 'Create a new client' })
  create(@Body() dto: CreateClientDto, @CurrentUser() user: CurrentUserPayload) {
    return this.clientsService.create(user.tenantId, dto, user.sub);
  }

  @Get()
  @RequirePermissions('clients:read')
  @ApiOperation({ summary: 'List clients with filters & pagination' })
  findAll(@Query() query: QueryClientsDto, @CurrentUser() user: CurrentUserPayload) {
    return this.clientsService.findAll(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('clients:read')
  @ApiOperation({ summary: 'Get client full detail' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.clientsService.findOne(user.tenantId, id);
  }

  @Get(':id/stats')
  @RequirePermissions('clients:read')
  @ApiOperation({ summary: 'Get client statistics' })
  getStats(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.clientsService.getStats(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('clients:update')
  @ApiOperation({ summary: 'Update client' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clientsService.update(user.tenantId, id, dto, user.sub);
  }

  @Delete(':id')
  @RequirePermissions('clients:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete client' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.clientsService.remove(user.tenantId, id, user.sub);
  }

  // Notes
  @Get(':id/notes')
  @RequirePermissions('clients:read')
  @ApiOperation({ summary: 'List client notes' })
  getNotes(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.clientsService.getNotes(user.tenantId, id);
  }

  @Post(':id/notes')
  @RequirePermissions('clients:update')
  @ApiOperation({ summary: 'Add note to client' })
  addNote(
    @Param('id') id: string,
    @Body() dto: AddNoteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clientsService.addNote(
      user.tenantId, id, dto.content, dto.type, dto.isPrivate, user.sub,
    );
  }

  // Tags
  @Post(':id/tags/:tagId')
  @RequirePermissions('clients:update')
  @ApiOperation({ summary: 'Add tag to client' })
  addTag(
    @Param('id') id: string,
    @Param('tagId') tagId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clientsService.addTag(user.tenantId, id, tagId);
  }

  @Delete(':id/tags/:tagId')
  @RequirePermissions('clients:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove tag from client' })
  removeTag(
    @Param('id') id: string,
    @Param('tagId') tagId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clientsService.removeTag(user.tenantId, id, tagId);
  }
}
