import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpsertSettingDto } from './dto/upsert-setting.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const settings = await this.prisma.tenantSetting.findMany({
      where: { tenantId },
      orderBy: { key: 'asc' },
    });

    return settings.reduce<Record<string, unknown>>((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
  }

  async findOne(tenantId: string, key: string) {
    const setting = await this.prisma.tenantSetting.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });

    if (!setting) throw new NotFoundException(`Setting "${key}" not found`);
    return setting;
  }

  async upsert(tenantId: string, dto: UpsertSettingDto) {
    return this.prisma.tenantSetting.upsert({
      where: { tenantId_key: { tenantId, key: dto.key } },
      create: {
        tenantId,
        key: dto.key,
        value: dto.value as Prisma.InputJsonValue,
      },
      update: { value: dto.value as Prisma.InputJsonValue },
    });
  }

  async upsertMany(tenantId: string, settings: UpsertSettingDto[]) {
    return Promise.all(
      settings.map((dto) => this.upsert(tenantId, dto)),
    );
  }

  async remove(tenantId: string, key: string) {
    await this.findOne(tenantId, key);
    return this.prisma.tenantSetting.delete({
      where: { tenantId_key: { tenantId, key } },
    });
  }
}
