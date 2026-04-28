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
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PaginationQuery } from '../../common/utils/pagination.util';

@ApiTags('Roles')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'roles', version: '1' })
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions('roles:create')
  @ApiOperation({ summary: 'Create a new role' })
  create(@Body() dto: CreateRoleDto, @CurrentUser() user: CurrentUserPayload) {
    return this.rolesService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'List all roles' })
  findAll(@Query() query: PaginationQuery, @CurrentUser() user: CurrentUserPayload) {
    return this.rolesService.findAll(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'Get role by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.rolesService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('roles:update')
  @ApiOperation({ summary: 'Update role' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.rolesService.update(user.tenantId, id, dto);
  }

  @Patch(':id/permissions')
  @RequirePermissions('roles:update')
  @ApiOperation({ summary: 'Sync permissions on a role (replaces all)' })
  syncPermissions(
    @Param('id') id: string,
    @Body() body: { permissionIds: string[] },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.rolesService.syncPermissions(user.tenantId, id, body.permissionIds);
  }

  @Delete(':id')
  @RequirePermissions('roles:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete role' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.rolesService.remove(user.tenantId, id);
  }
}
