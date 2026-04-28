import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { hashPassword } from '../../common/utils/hash.util';
import {
  getPaginationParams,
  buildPaginatedResult,
} from '../../common/utils/pagination.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { AuditAction } from '@prisma/client';

const USER_SELECT = {
  id: true,
  tenantId: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
  status: true,
  isEmailVerified: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  userRoles: {
    include: { role: { select: { id: true, name: true, description: true } } },
  },
} as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(tenantId: string, dto: CreateUserDto, createdBy?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email.toLowerCase() } },
    });

    if (existing) {
      throw new ConflictException('Email already registered in this tenant');
    }

    if (dto.roleIds?.length) {
      const roles = await this.prisma.role.findMany({
        where: { id: { in: dto.roleIds }, tenantId },
      });
      if (roles.length !== dto.roleIds.length) {
        throw new NotFoundException('One or more roles not found');
      }
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
        status: dto.status,
        ...(dto.roleIds?.length && {
          userRoles: {
            create: dto.roleIds.map((roleId) => ({
              roleId,
              assignedBy: createdBy,
            })),
          },
        }),
      },
      select: USER_SELECT,
    });

    await this.auditLogService.log({
      tenantId,
      userId: createdBy,
      action: AuditAction.CREATE,
      resource: 'users',
      resourceId: user.id,
      newValues: { email: user.email, firstName: user.firstName, lastName: user.lastName },
    });

    this.logger.log(`User created: ${user.email} (tenant: ${tenantId})`);
    return user;
  }

  async findAll(tenantId: string, query: QueryUsersDto) {
    const { skip, take, page, limit } = getPaginationParams(query);

    const where = {
      tenantId,
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.roleId && {
        userRoles: { some: { roleId: query.roleId } },
      }),
      ...(query.search && {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' as const } },
          { lastName: { contains: query.search, mode: 'insensitive' as const } },
          { email: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        select: USER_SELECT,
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: USER_SELECT,
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateUserDto,
    updatedBy?: string,
  ) {
    const user = await this.findOne(tenantId, id);

    const { roleIds, ...updateData } = dto as UpdateUserDto & {
      roleIds?: string[];
    };

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        ...(roleIds !== undefined && {
          userRoles: {
            deleteMany: {},
            create: roleIds.map((roleId) => ({
              roleId,
              assignedBy: updatedBy,
            })),
          },
        }),
      },
      select: USER_SELECT,
    });

    await this.auditLogService.log({
      tenantId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      resource: 'users',
      resourceId: id,
      oldValues: { firstName: user.firstName, lastName: user.lastName, status: user.status },
      newValues: { ...dto },
    });

    return updated;
  }

  async toggleStatus(tenantId: string, id: string, updatedBy?: string) {
    const user = await this.findOne(tenantId, id);

    if (updatedBy === id) {
      throw new ForbiddenException('Cannot change your own status');
    }

    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: USER_SELECT,
    });

    await this.auditLogService.log({
      tenantId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      resource: 'users',
      resourceId: id,
      oldValues: { status: user.status },
      newValues: { status: newStatus },
    });

    return updated;
  }

  async remove(tenantId: string, id: string, deletedBy?: string) {
    await this.findOne(tenantId, id);

    if (deletedBy === id) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), refreshToken: null },
    });

    await this.auditLogService.log({
      tenantId,
      userId: deletedBy,
      action: AuditAction.DELETE,
      resource: 'users',
      resourceId: id,
    });
  }

  async assignRoles(
    tenantId: string,
    userId: string,
    roleIds: string[],
    assignedBy?: string,
  ) {
    await this.findOne(tenantId, userId);

    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds }, tenantId },
    });

    if (roles.length !== roleIds.length) {
      throw new NotFoundException('One or more roles not found');
    }

    await this.prisma.userRole.deleteMany({ where: { userId } });

    await this.prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId, assignedBy })),
    });

    return this.findOne(tenantId, userId);
  }
}
