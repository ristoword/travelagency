import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('CRM — Contacts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'contacts', version: '1' })
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @RequirePermissions('clients:create')
  @ApiOperation({ summary: 'Add contact to a client' })
  create(@Body() dto: CreateContactDto, @CurrentUser() user: CurrentUserPayload) {
    return this.contactsService.create(user.tenantId, dto, user.sub);
  }

  @Get()
  @RequirePermissions('clients:read')
  @ApiOperation({ summary: 'List contacts for a client' })
  @ApiQuery({ name: 'clientId', required: true })
  findByClient(@Query('clientId') clientId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.contactsService.findByClient(user.tenantId, clientId);
  }

  @Get(':id')
  @RequirePermissions('clients:read')
  @ApiOperation({ summary: 'Get contact detail' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.contactsService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('clients:update')
  @ApiOperation({ summary: 'Update contact' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateContactDto>,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.contactsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('clients:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete contact' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.contactsService.remove(user.tenantId, id);
  }
}
