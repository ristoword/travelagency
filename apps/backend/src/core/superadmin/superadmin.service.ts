import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TenantPlan, UserStatus } from '@prisma/client';
import { IsString, IsOptional, IsEmail, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { hashPassword } from '../../common/utils/hash.util';

export class CreateTenantDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() slug: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional({ enum: TenantPlan }) @IsOptional() @IsEnum(TenantPlan) plan?: TenantPlan;
  @ApiPropertyOptional() @IsOptional() @IsString() vatNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
}

export class UpdateTenantDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional({ enum: TenantPlan }) @IsOptional() @IsEnum(TenantPlan) plan?: TenantPlan;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVerified?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() suspendedReason?: string;
}

export class ResetPasswordDto {
  @ApiProperty() @IsString() newPassword: string;
}

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Stats ──────────────────────────────────────────────────────────────────

  async getStats() {
    const [totalTenants, activeTenants, suspendedTenants, trialTenants, totalUsers, activeUsers, blockedUsers] = await Promise.all([
      this.prisma.tenant.count({ where: { deletedAt: null } }),
      this.prisma.tenant.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.tenant.count({ where: { deletedAt: null, isActive: false } }),
      this.prisma.tenant.count({ where: { deletedAt: null, plan: TenantPlan.STARTER } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, status: UserStatus.ACTIVE } }),
      this.prisma.user.count({ where: { deletedAt: null, status: UserStatus.SUSPENDED } }),
    ]);

    const planDistribution = await this.prisma.tenant.groupBy({
      by: ['plan'],
      where: { deletedAt: null },
      _count: true,
    });

    const recentTenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, slug: true, plan: true, isActive: true, isVerified: true, createdAt: true, email: true },
    });

    return {
      tenants: { total: totalTenants, active: activeTenants, suspended: suspendedTenants, trial: trialTenants, planDistribution },
      users: { total: totalUsers, active: activeUsers, blocked: blockedUsers },
      recentTenants,
    };
  }

  // ── Tenants ────────────────────────────────────────────────────────────────

  async listTenants(search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { slug: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, slug: true, email: true, phone: true,
          plan: true, isActive: true, isVerified: true, licenseKey: true,
          city: true, country: true, vatNumber: true,
          suspendedAt: true, suspendedReason: true, trialEndsAt: true,
          createdAt: true, updatedAt: true,
          _count: { select: { users: true } },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, clients: true, travelCases: true, bookings: true } },
        users: {
          where: { deletedAt: null },
          select: { id: true, email: true, firstName: true, lastName: true, status: true, isSuperAdmin: true, lastLoginAt: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async createTenant(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException(`Slug '${dto.slug}' already in use`);

    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        email: dto.email,
        phone: dto.phone,
        plan: dto.plan ?? TenantPlan.STARTER,
        vatNumber: dto.vatNumber,
        city: dto.city,
        isActive: true,
        isVerified: false,
      },
    });
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    await this.getTenant(id);
    return this.prisma.tenant.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        plan: dto.plan,
        isActive: dto.isActive,
        isVerified: dto.isVerified,
        suspendedReason: dto.suspendedReason,
        suspendedAt: dto.isActive === false ? new Date() : dto.isActive === true ? null : undefined,
      },
    });
  }

  async suspendTenant(id: string, reason?: string) {
    await this.getTenant(id);
    return this.prisma.tenant.update({
      where: { id },
      data: { isActive: false, suspendedAt: new Date(), suspendedReason: reason ?? 'Suspended by superadmin' },
    });
  }

  async activateTenant(id: string) {
    await this.getTenant(id);
    return this.prisma.tenant.update({
      where: { id },
      data: { isActive: true, suspendedAt: null, suspendedReason: null },
    });
  }

  async verifyTenant(id: string) {
    await this.getTenant(id);
    return this.prisma.tenant.update({
      where: { id },
      data: { isVerified: true },
    });
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  async listUsers(search?: string, tenantId?: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const where = {
      deletedAt: null,
      ...(tenantId && { tenantId }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          status: true, isSuperAdmin: true, isEmailVerified: true,
          lastLoginAt: true, createdAt: true, lockedUntil: true,
          tenant: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async blockUser(id: string, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isSuperAdmin) throw new BadRequestException('Cannot block a superadmin user');
    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.SUSPENDED, lockedUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    });
  }

  async unblockUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE, lockedUntil: null, failedLoginAttempts: 0 },
    });
  }

  async resetUserPassword(id: string, dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const hashed = await hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashed, passwordChangedAt: new Date(), refreshToken: null },
    });
    return { success: true, message: 'Password reset successfully' };
  }
}
