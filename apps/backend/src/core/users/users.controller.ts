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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('users:create')
  @ApiOperation({ summary: 'Create a new user in the current tenant' })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.create(user.tenantId, dto, user.sub);
  }

  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'List all users in the current tenant' })
  findAll(
    @Query() query: QueryUsersDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.findAll(user.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Update user' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.update(user.tenantId, id, dto, user.sub);
  }

  @Patch(':id/toggle-status')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Toggle user active/inactive status' })
  toggleStatus(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.toggleStatus(user.tenantId, id, user.sub);
  }

  @Post(':id/roles')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Assign roles to user' })
  assignRoles(
    @Param('id') id: string,
    @Body() body: { roleIds: string[] },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.assignRoles(
      user.tenantId,
      id,
      body.roleIds,
      user.sub,
    );
  }

  @Delete(':id')
  @RequirePermissions('users:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete user' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.remove(user.tenantId, id, user.sub);
  }
}
