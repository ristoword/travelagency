import {
  Injectable, NotFoundException, ConflictException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { TagType } from '@prisma/client';

@Injectable()
export class CustomerTagsService {
  private readonly logger = new Logger(CustomerTagsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateTagDto) {
    const existing = await this.prisma.tag.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    });
    if (existing) throw new ConflictException(`Tag "${dto.name}" already exists`);

    const tag = await this.prisma.tag.create({ data: { tenantId, ...dto } });
    this.logger.log(`Tag created: ${tag.name} (tenant: ${tenantId})`);
    return tag;
  }

  async findAll(tenantId: string, type?: TagType) {
    return this.prisma.tag.findMany({
      where: { tenantId, ...(type && { type }) },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { clientTags: true, leadTags: true } },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const tag = await this.prisma.tag.findFirst({ where: { id, tenantId } });
    if (!tag) throw new NotFoundException('Tag not found');
    return tag;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateTagDto>) {
    await this.findOne(tenantId, id);
    return this.prisma.tag.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { clientTags: true, leadTags: true } } },
    });
    if (!tag) throw new NotFoundException('Tag not found');

    const inUse = tag._count.clientTags + tag._count.leadTags;
    if (inUse > 0) {
      throw new ConflictException(`Tag is in use by ${inUse} record(s). Remove assignments first.`);
    }

    return this.prisma.tag.delete({ where: { id } });
  }
}
