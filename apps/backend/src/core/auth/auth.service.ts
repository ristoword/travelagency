import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { hashPassword, comparePassword } from '../../common/utils/hash.util';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuditAction } from '@prisma/client';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    // Resolve tenant
    const tenantSlug =
      dto.tenantSlug ||
      (await this.resolveTenantFromRequest(ipAddress));

    if (!tenantSlug) {
      throw new UnauthorizedException('Tenant not specified');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug, isActive: true, deletedAt: null },
    });

    if (!tenant) {
      throw new UnauthorizedException('Invalid tenant or tenant inactive');
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: dto.email.toLowerCase() } },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      await this.auditLogService.log({
        tenantId: tenant.id,
        action: AuditAction.LOGIN_FAILED,
        resource: 'auth',
        ipAddress,
        userAgent,
        metadata: { email: dto.email, reason: 'user_not_found' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(
        `Account locked until ${user.lockedUntil.toISOString()}`,
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(dto.password, user.password);

    if (!isPasswordValid) {
      const failedAttempts = user.failedLoginAttempts + 1;
      const shouldLock = failedAttempts >= MAX_LOGIN_ATTEMPTS;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          ...(shouldLock && {
            lockedUntil: new Date(
              Date.now() + LOCK_DURATION_MINUTES * 60 * 1000,
            ),
          }),
        },
      });

      await this.auditLogService.log({
        tenantId: tenant.id,
        userId: user.id,
        action: AuditAction.LOGIN_FAILED,
        resource: 'auth',
        ipAddress,
        userAgent,
        metadata: { attempts: failedAttempts },
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Account is not active');
    }

    // Build permissions list
    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map(
            (rp) => `${rp.permission.resource}:${rp.permission.action}`,
          ),
        ),
      ),
    ];

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      tenantId: tenant.id,
      roles,
      permissions,
    });

    // Update user on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        refreshToken: tokens.hashedRefreshToken,
      },
    });

    await this.auditLogService.log({
      tenantId: tenant.id,
      userId: user.id,
      action: AuditAction.LOGIN,
      resource: 'auth',
      ipAddress,
      userAgent,
    });

    this.logger.log(`User logged in: ${user.email} (tenant: ${tenant.slug})`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        roles,
        permissions,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
      },
    };
  }

  async register(
    tenantId: string,
    dto: RegisterDto,
    createdByUserId?: string,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        tenantId_email: { tenantId, email: dto.email.toLowerCase() },
      },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
      },
    });

    await this.auditLogService.log({
      tenantId,
      userId: createdByUserId,
      action: AuditAction.CREATE,
      resource: 'users',
      resourceId: user.id,
      newValues: { email: user.email, firstName: user.firstName },
    });

    return user;
  }

  async refreshTokens(
    userId: string,
    tenantId: string,
    refreshToken: string,
    roles: string[],
    permissions: string[],
    email: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null, status: 'ACTIVE' },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    const isValid = await comparePassword(refreshToken, user.refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens({
      sub: userId,
      email,
      tenantId,
      roles,
      permissions,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: tokens.hashedRefreshToken },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return { message: 'Logged out successfully' };
  }

  async changePassword(
    userId: string,
    tenantId: string,
    dto: ChangePasswordDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
    });

    if (!user) throw new UnauthorizedException('User not found');

    const isValid = await comparePassword(dto.currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await hashPassword(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        refreshToken: null,
      },
    });

    await this.auditLogService.log({
      tenantId,
      userId,
      action: AuditAction.PASSWORD_CHANGE,
      resource: 'users',
      resourceId: userId,
    });

    return { message: 'Password changed successfully' };
  }

  async getProfile(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        status: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  private async generateTokens(payload: Omit<JwtPayload, 'type'>) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...payload, type: 'access' } satisfies JwtPayload,
        {
          secret: this.configService.get<string>('jwt.secret'),
          expiresIn: this.configService.get<string>('jwt.expiresIn'),
        },
      ),
      this.jwtService.signAsync(
        { ...payload, type: 'refresh' } satisfies JwtPayload,
        {
          secret: this.configService.get<string>('jwt.refreshSecret'),
          expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
        },
      ),
    ]);

    const hashedRefreshToken = await hashPassword(refreshToken);

    return { accessToken, refreshToken, hashedRefreshToken };
  }

  private async resolveTenantFromRequest(
    _ipAddress?: string,
  ): Promise<string | null> {
    return null;
  }
}
