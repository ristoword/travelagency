import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ClientDocumentsService, QueryDocumentsDto } from './client-documents.service';
import { CreateClientDocumentDto } from './dto/create-document.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('Documents — Client Documents')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'client-documents', version: '1' })
export class ClientDocumentsController {
  constructor(private readonly service: ClientDocumentsService) {}

  @Post()
  @RequirePermissions('documents:create')
  @ApiOperation({ summary: 'Upload/register document for client or passenger' })
  create(@Body() dto: CreateClientDocumentDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(user.tenantId, dto, user.sub);
  }

  @Get()
  @RequirePermissions('documents:read')
  @ApiOperation({ summary: 'List documents with filters (clientId, type, status, expiringWithinDays)' })
  findAll(@Query() query: QueryDocumentsDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findAll(user.tenantId, query);
  }

  @Get('expiry-alerts')
  @RequirePermissions('documents:read')
  @ApiOperation({ summary: 'Get expiry alerts: expired, expiring in 30/60/90 days + critical list' })
  getExpiryAlerts(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getExpiryAlerts(user.tenantId);
  }

  @Post('refresh-statuses')
  @RequirePermissions('documents:create')
  @ApiOperation({ summary: 'Batch refresh all document statuses (VALID/EXPIRING_SOON/EXPIRED)' })
  refreshStatuses(@CurrentUser() user: CurrentUserPayload) {
    return this.service.refreshStatuses(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('documents:read')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('documents:create')
  update(@Param('id') id: string, @Body() dto: Partial<CreateClientDocumentDto>, @CurrentUser() user: CurrentUserPayload) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('documents:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(user.tenantId, id);
  }
}
