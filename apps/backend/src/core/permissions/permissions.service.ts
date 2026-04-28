import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePermissionDto) {
    const existing = await this.prisma.permission.findUnique({
      where: { resource_action: { resource: dto.resource, action: dto.action } },
    });

    if (existing) {
      throw new ConflictException(
        `Permission "${dto.resource}:${dto.action}" already exists`,
      );
    }

    const permission = await this.prisma.permission.create({ data: dto });
    this.logger.log(`Permission created: ${permission.resource}:${permission.action}`);
    return permission;
  }

  async createMany(permissions: CreatePermissionDto[]) {
    const result = await this.prisma.permission.createMany({
      data: permissions,
      skipDuplicates: true,
    });
    return result;
  }

  async findAll(resource?: string) {
    const permissions = await this.prisma.permission.findMany({
      where: resource ? { resource } : undefined,
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });

    // Group by resource for better readability
    const grouped = permissions.reduce<Record<string, typeof permissions>>(
      (acc, perm) => {
        if (!acc[perm.resource]) acc[perm.resource] = [];
        acc[perm.resource].push(perm);
        return acc;
      },
      {},
    );

    return { permissions, grouped };
  }

  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) throw new NotFoundException('Permission not found');
    return permission;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.permission.delete({ where: { id } });
  }
}
