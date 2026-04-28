import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';

export interface UpsertPreferenceDto {
  key: string;
  value: unknown;
}

/**
 * Standard preference keys for travel agencies:
 * - seat_preference: "window" | "aisle" | "middle"
 * - meal_preference: "standard" | "vegetarian" | "vegan" | "halal" | "kosher"
 * - cabin_class: "economy" | "premium_economy" | "business" | "first"
 * - hotel_category: 3 | 4 | 5 (stars)
 * - room_type: "single" | "double" | "twin" | "suite"
 * - travel_insurance: true | false
 * - newsletter_topics: ["beach", "culture", "adventure"]
 * - dietary_restrictions: ["gluten_free", "lactose_free"]
 * - special_needs: "wheelchair" | "none"
 */

@Injectable()
export class CustomerPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkClient(tenantId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Client not found');
  }

  async findAll(tenantId: string, clientId: string) {
    await this.checkClient(tenantId, clientId);

    const prefs = await this.prisma.customerPreference.findMany({
      where: { clientId, tenantId },
      orderBy: { key: 'asc' },
    });

    return prefs.reduce<Record<string, unknown>>((acc, p) => {
      acc[p.key] = p.value;
      return acc;
    }, {});
  }

  async upsert(tenantId: string, clientId: string, dto: UpsertPreferenceDto) {
    await this.checkClient(tenantId, clientId);

    return this.prisma.customerPreference.upsert({
      where: { clientId_key: { clientId, key: dto.key } },
      create: { tenantId, clientId, key: dto.key, value: dto.value as Prisma.InputJsonValue },
      update: { value: dto.value as Prisma.InputJsonValue },
    });
  }

  async upsertMany(tenantId: string, clientId: string, preferences: UpsertPreferenceDto[]) {
    await this.checkClient(tenantId, clientId);

    return Promise.all(
      preferences.map((p) =>
        this.prisma.customerPreference.upsert({
          where: { clientId_key: { clientId, key: p.key } },
          create: { tenantId, clientId, key: p.key, value: p.value as Prisma.InputJsonValue },
          update: { value: p.value as Prisma.InputJsonValue },
        }),
      ),
    );
  }

  async remove(tenantId: string, clientId: string, key: string) {
    await this.checkClient(tenantId, clientId);
    await this.prisma.customerPreference.delete({
      where: { clientId_key: { clientId, key } },
    });
  }
}
