import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  getPaginationParams,
  buildPaginatedResult,
  PaginationQuery,
} from '../../common/utils/pagination.util';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

const ROLE_SELECT = {
  id: true,
  tenantId: true,
  name: true,
  description: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
  rolePermissions: {
    include: {
      permission: { select: { id: true, resource: true, action: true, description: true } },
    },
  },
  _count: { select: { userRoles: true } },
} as const;

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    });

    if (existing) {
      throw new ConflictException(`Role "${dto.name}" already exists`);
    }

    if (dto.permissionIds?.length) {
      const permissions = await this.prisma.permission.findMany({
        where: { id: { in: dto.permissionIds } },
      });
      if (permissions.length !== dto.permissionIds.length) {
        throw new NotFoundException('One or more permissions not found');
      }
    }

    const role = await this.prisma.role.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        isSystem: dto.isSystem,
        ...(dto.permissionIds?.length && {
          rolePermissions: {
            create: dto.permissionIds.map((permissionId) => ({ permissionId })),
          },
        }),
      },
      select: ROLE_SELECT,
    });

    this.logger.log(`Role created: ${role.name} (tenant: ${tenantId})`);
    return role;
  }

  async findAll(tenantId: string, query: PaginationQuery) {
    const { skip, take, page, limit } = getPaginationParams(query);

    const where = {
      tenantId,
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { description: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip,
        take,
        orderBy: { [query.sortBy || 'name']: query.sortOrder || 'asc' },
        select: ROLE_SELECT,
      }),
      this.prisma.role.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId },
      select: ROLE_SELECT,
    });

    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async update(tenantId: string, id: string, dto: UpdateRoleDto) {
    const role = await this.findOne(tenantId, id);

    if (role.isSystem) {
      throw new ForbiddenException('System roles cannot be modified');
    }

    const { permissionIds, ...updateData } = dto;

    return this.prisma.role.update({
      where: { id },
      data: {
        ...updateData,
        ...(permissionIds !== undefined && {
          rolePermissions: {
            deleteMany: {},
            create: permissionIds.map((permissionId) => ({ permissionId })),
          },
        }),
      },
      select: ROLE_SELECT,
    });
  }

  async remove(tenantId: string, id: string) {
    const role = await this.findOne(tenantId, id);

    if (role.isSystem) {
      throw new ForbiddenException('System roles cannot be deleted');
    }

    if (role._count.userRoles > 0) {
      throw new ConflictException(
        `Role is assigned to ${role._count.userRoles} user(s). Remove assignments first.`,
      );
    }

    return this.prisma.role.delete({ where: { id } });
  }

  async syncPermissions(tenantId: string, roleId: string, permissionIds: string[]) {
    await this.findOne(tenantId, roleId);

    await this.prisma.rolePermission.deleteMany({ where: { roleId } });

    if (permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      });
    }

    return this.findOne(tenantId, roleId);
  }
}
