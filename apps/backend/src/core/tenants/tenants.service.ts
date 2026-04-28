import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import {
  getPaginationParams,
  buildPaginatedResult,
  PaginationQuery,
} from '../../common/utils/pagination.util';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Tenant with slug "${dto.slug}" already exists`);
    }

    const tenant = await this.prisma.tenant.create({ data: dto });
    this.logger.log(`Tenant created: ${tenant.slug} (${tenant.id})`);
    return tenant;
  }

  async findAll(query: PaginationQuery) {
    const { skip, take, page, limit } = getPaginationParams(query);

    const where = {
      deletedAt: null,
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { slug: { contains: query.search, mode: 'insensitive' as const } },
          { email: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          phone: true,
          city: true,
          country: true,
          plan: true,
          isActive: true,
          createdAt: true,
          _count: { select: { users: true } },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { users: true, roles: true } },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, deletedAt: null },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);

    return this.prisma.tenant.update({
      where: { id },
      data: dto,
    });
  }

  async toggleActive(id: string) {
    const tenant = await this.findOne(id);

    return this.prisma.tenant.update({
      where: { id },
      data: { isActive: !tenant.isActive },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
