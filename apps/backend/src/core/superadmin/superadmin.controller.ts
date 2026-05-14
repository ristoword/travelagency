import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from './superadmin.guard';
import {
  SuperAdminService,
  CreateTenantDto,
  UpdateTenantDto,
  ResetPasswordDto,
} from './superadmin.service';

@ApiTags('SuperAdmin')
@Controller('superadmin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@ApiBearerAuth('access-token')
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  // ── Stats ──────────────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Global platform statistics' })
  getStats() {
    return this.service.getStats();
  }

  // ── Tenants ────────────────────────────────────────────────────────────────

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listTenants(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listTenants(search, page ? Number(page) : 1, limit ? Number(limit) : 20);
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Get tenant details with users' })
  getTenant(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getTenant(id);
  }

  @Post('tenants')
  @ApiOperation({ summary: 'Create new tenant' })
  createTenant(@Body() dto: CreateTenantDto) {
    return this.service.createTenant(dto);
  }

  @Patch('tenants/:id')
  @ApiOperation({ summary: 'Update tenant (plan, status, verification)' })
  updateTenant(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto) {
    return this.service.updateTenant(id, dto);
  }

  @Post('tenants/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a tenant (sets isActive=false)' })
  suspendTenant(@Param('id', ParseUUIDPipe) id: string, @Body() body: { reason?: string }) {
    return this.service.suspendTenant(id, body.reason);
  }

  @Post('tenants/:id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate a suspended tenant' })
  activateTenant(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.activateTenant(id);
  }

  @Post('tenants/:id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark tenant as verified' })
  verifyTenant(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.verifyTenant(id);
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users across all tenants' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  listUsers(
    @Query('search') search?: string,
    @Query('tenantId') tenantId?: string,
    @Query('page') page?: number,
  ) {
    return this.service.listUsers(search, tenantId, page ? Number(page) : 1);
  }

  @Post('users/:id/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block/suspend a user' })
  blockUser(@Param('id', ParseUUIDPipe) id: string, @Body() body: { reason?: string }) {
    return this.service.blockUser(id, body.reason);
  }

  @Post('users/:id/unblock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock a user and reset failed attempts' })
  unblockUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.unblockUser(id);
  }

  @Post('users/:id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force reset user password' })
  resetPassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResetPasswordDto) {
    return this.service.resetUserPassword(id, dto);
  }
}
