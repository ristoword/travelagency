import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { QuotationItemType } from '@prisma/client';

export interface MarginAnalysis {
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  marginPercent: number;
  byItemType: Record<string, { revenue: number; cost: number; margin: number; marginPercent: number }>;
}

export interface PricingSuggestion {
  costPrice: number;
  targetMarginPercent: number;
  suggestedSellingPrice: number;
  markup: number;
}

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Suggest a selling price given a cost and target margin
   * margin% = (price - cost) / price * 100
   * => price = cost / (1 - margin%/100)
   */
  calculateSellingPrice(costPrice: number, targetMarginPercent: number): PricingSuggestion {
    if (targetMarginPercent >= 100) throw new Error('Margin cannot be 100% or more');
    const sellingPrice = costPrice / (1 - targetMarginPercent / 100);
    const markup = ((sellingPrice - costPrice) / costPrice) * 100;
    return {
      costPrice,
      targetMarginPercent,
      suggestedSellingPrice: parseFloat(sellingPrice.toFixed(2)),
      markup: parseFloat(markup.toFixed(2)),
    };
  }

  /**
   * Full margin analysis for a quotation
   */
  async analyzeQuotation(tenantId: string, quotationId: string): Promise<MarginAnalysis> {
    const items = await this.prisma.quotationItem.findMany({
      where: { quotationId, tenantId },
    });

    const byType: Record<string, { revenue: number; cost: number }> = {};
    let totalRevenue = 0;
    let totalCost = 0;

    for (const item of items) {
      const revenue = Number(item.totalPrice);
      const cost = Number(item.totalCost);
      totalRevenue += revenue;
      totalCost += cost;

      if (!byType[item.type]) byType[item.type] = { revenue: 0, cost: 0 };
      byType[item.type].revenue += revenue;
      byType[item.type].cost += cost;
    }

    const totalMargin = totalRevenue - totalCost;
    const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    const byItemType: MarginAnalysis['byItemType'] = {};
    for (const [type, data] of Object.entries(byType)) {
      const margin = data.revenue - data.cost;
      byItemType[type] = {
        revenue: data.revenue,
        cost: data.cost,
        margin,
        marginPercent: data.revenue > 0 ? parseFloat(((margin / data.revenue) * 100).toFixed(2)) : 0,
      };
    }

    return {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      totalMargin: parseFloat(totalMargin.toFixed(2)),
      marginPercent: parseFloat(marginPercent.toFixed(2)),
      byItemType,
    };
  }

  /**
   * Tenant-level margin analytics
   */
  async getTenantMarginStats(tenantId: string) {
    const [byType, monthly] = await Promise.all([
      this.prisma.quotationItem.groupBy({
        by: ['type'],
        where: { tenantId },
        _sum: { totalPrice: true, totalCost: true, marginAmount: true },
        _avg: { marginPercent: true },
        _count: true,
      }),
      this.prisma.quotation.aggregate({
        where: { tenantId, status: { in: ['ACCEPTED', 'CONVERTED'] } },
        _sum: { totalAmount: true, totalMargin: true, totalCost: true },
        _avg: { marginPercent: true },
      }),
    ]);

    return { byType, overall: monthly ?? null };
  }
}
