import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QuotationStatus, InvoiceStatus, CaseStatus, BookingStatus, LeadStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Main Dashboard KPIs ───────────────────────────────────────────────────

  async getDashboardKpis(tenantId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      // Revenue
      invoicesThisMonth,
      invoicesLastMonth,
      invoicesYTD,
      // Leads
      leadsTotal,
      leadsWon,
      leadsNew,
      // Cases
      casesActive,
      casesCompleted,
      casesUpcoming,
      // Clients
      clientsTotal,
      clientsNew,
      // Bookings
      bookingsPending,
      // Outstanding invoices
      invoicesOverdue,
    ] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { tenantId, deletedAt: null, issuedAt: { gte: startOfMonth }, status: { notIn: ['DRAFT', 'CANCELLED'] } },
        _sum: { totalAmount: true, paidAmount: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { tenantId, deletedAt: null, issuedAt: { gte: startOfLastMonth, lte: endOfLastMonth }, status: { notIn: ['DRAFT', 'CANCELLED'] } },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { tenantId, deletedAt: null, issuedAt: { gte: startOfYear }, status: { notIn: ['DRAFT', 'CANCELLED'] } },
        _sum: { totalAmount: true },
      }),
      this.prisma.lead.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.lead.count({ where: { tenantId, deletedAt: null, status: LeadStatus.WON } }),
      this.prisma.lead.count({ where: { tenantId, deletedAt: null, status: LeadStatus.NEW } }),
      this.prisma.travelCase.count({ where: { tenantId, deletedAt: null, status: { in: [CaseStatus.CONFIRMED, CaseStatus.IN_PROGRESS] } } }),
      this.prisma.travelCase.count({ where: { tenantId, deletedAt: null, status: CaseStatus.COMPLETED } }),
      this.prisma.travelCase.count({ where: { tenantId, deletedAt: null, status: { in: [CaseStatus.CONFIRMED, CaseStatus.IN_PROGRESS] }, departureDate: { gte: now } } }),
      this.prisma.client.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.client.count({ where: { tenantId, deletedAt: null, createdAt: { gte: startOfMonth } } }),
      this.prisma.booking.count({ where: { tenantId, deletedAt: null, status: BookingStatus.PENDING } }),
      this.prisma.invoice.aggregate({
        where: { tenantId, deletedAt: null, status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID] }, dueDate: { lt: now } },
        _sum: { balanceDue: true },
        _count: true,
      }),
    ]);

    const revenueThisMonth = Number(invoicesThisMonth._sum?.totalAmount ?? 0);
    const revenueLastMonth = Number(invoicesLastMonth._sum?.totalAmount ?? 0);
    const revenueChange = revenueLastMonth > 0
      ? (((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100).toFixed(1)
      : null;

    const revenueYTD = Number(invoicesYTD._sum?.totalAmount ?? 0);

    // Margins come from quotations (invoices don't store cost)
    const quotationMarginYTD = await this.prisma.quotation.aggregate({
      where: { tenantId, deletedAt: null, status: { in: ['ACCEPTED', 'CONVERTED'] } },
      _sum: { totalMargin: true },
      _avg: { marginPercent: true },
    });
    const marginYTD = Number(quotationMarginYTD._sum?.totalMargin ?? 0);
    const marginPercent = quotationMarginYTD._avg?.marginPercent
      ? Number(quotationMarginYTD._avg.marginPercent).toFixed(1)
      : '0';

    return {
      revenue: {
        thisMonth: revenueThisMonth,
        lastMonth: revenueLastMonth,
        changePercent: revenueChange,
        ytd: revenueYTD,
        invoicesCount: invoicesThisMonth._count,
      },
      margins: {
        ytd: marginYTD,
        percent: parseFloat(marginPercent),
      },
      leads: {
        total: leadsTotal,
        new: leadsNew,
        won: leadsWon,
        conversionRate: leadsTotal > 0 ? parseFloat(((leadsWon / leadsTotal) * 100).toFixed(1)) : 0,
      },
      cases: {
        active: casesActive,
        completed: casesCompleted,
        upcoming: casesUpcoming,
      },
      clients: {
        total: clientsTotal,
        newThisMonth: clientsNew,
      },
      alerts: {
        bookingsPending,
        overdueInvoices: invoicesOverdue._count,
        overdueAmount: Number(invoicesOverdue._sum?.balanceDue ?? 0),
      },
    };
  }

  // ── Sales Analytics ───────────────────────────────────────────────────────

  async getSalesAnalytics(tenantId: string, period: '1M' | '3M' | '6M' | '12M' = '6M') {
    const months = { '1M': 1, '3M': 3, '6M': 6, '12M': 12 }[period];
    const from = new Date();
    from.setMonth(from.getMonth() - months);

    const [quotationsByStatus, revenueByMonth, topDestinations, topAgents, conversionFunnel] = await Promise.all([
      this.prisma.quotation.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null, createdAt: { gte: from } },
        _count: true,
        _sum: { totalAmount: true, totalMargin: true },
      }),
      this.prisma.invoice.findMany({
        where: { tenantId, deletedAt: null, issuedAt: { gte: from }, status: { notIn: ['DRAFT', 'CANCELLED'] } },
        select: { issuedAt: true, totalAmount: true },
        orderBy: { issuedAt: 'asc' },
      }),
      this.prisma.quotation.groupBy({
        by: ['destination'],
        where: { tenantId, deletedAt: null, destination: { not: null }, status: { in: ['ACCEPTED', 'CONVERTED'] } },
        _count: true,
        _sum: { totalAmount: true },
        orderBy: { _count: { destination: 'desc' } },
        take: 10,
      }),
      this.prisma.quotation.groupBy({
        by: ['assignedToId'],
        where: { tenantId, deletedAt: null, createdAt: { gte: from } },
        _count: true,
        _sum: { totalAmount: true, totalMargin: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5,
      }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
    ]);

    // Group revenue by month
    const monthlyRevenue = this.groupByMonth(
      revenueByMonth,
      (inv) => inv.issuedAt!,
      (inv) => ({ revenue: Number(inv.totalAmount) }),
    );

    return { quotationsByStatus, monthlyRevenue, topDestinations, topAgents, conversionFunnel };
  }

  // ── Margin Analytics ──────────────────────────────────────────────────────

  async getMarginAnalytics(tenantId: string) {
    const [byServiceType, bySupplier, quotationMargins, bookingMargins] = await Promise.all([
      this.prisma.quotationItem.groupBy({
        by: ['type'],
        where: { tenantId },
        _sum: { totalPrice: true, totalCost: true, marginAmount: true },
        _avg: { marginPercent: true },
        _count: true,
        orderBy: { _sum: { marginAmount: 'desc' } },
      }),
      this.prisma.booking.groupBy({
        by: ['supplierName'],
        where: { tenantId, deletedAt: null, supplierName: { not: null } },
        _sum: { amount: true, cost: true, marginAmount: true },
        _avg: { marginPercent: true },
        _count: true,
        orderBy: { _sum: { marginAmount: 'desc' } },
        take: 10,
      }),
      this.prisma.quotation.aggregate({
        where: { tenantId, deletedAt: null, status: { in: ['ACCEPTED', 'CONVERTED'] } },
        _sum: { totalAmount: true, totalCost: true, totalMargin: true },
        _avg: { marginPercent: true },
        _count: true,
      }),
      this.prisma.booking.aggregate({
        where: { tenantId, deletedAt: null, status: BookingStatus.CONFIRMED },
        _sum: { amount: true, cost: true, marginAmount: true, commissionAmount: true },
        _avg: { marginPercent: true },
        _count: true,
      }),
    ]);

    return { byServiceType, bySupplier, quotationSummary: quotationMargins, bookingSummary: bookingMargins };
  }

  // ── Client Analytics ──────────────────────────────────────────────────────

  async getClientAnalytics(tenantId: string) {
    const [bySource, byType, topClients, vipStats, acquisitionTrend] = await Promise.all([
      this.prisma.client.groupBy({
        by: ['source'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      this.prisma.client.groupBy({
        by: ['type'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      this.prisma.client.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { totalSpent: 'desc' },
        take: 10,
        select: {
          id: true, firstName: true, lastName: true, companyName: true,
          type: true, isVip: true, totalBookings: true, totalSpent: true, lastBookingDate: true,
        },
      }),
      this.prisma.client.aggregate({
        where: { tenantId, deletedAt: null, isVip: true },
        _count: true,
        _sum: { totalSpent: true },
        _avg: { totalSpent: true },
      }),
      this.prisma.client.findMany({
        where: { tenantId, deletedAt: null },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const monthlyAcquisition = this.groupByMonth(acquisitionTrend, c => c.createdAt, () => ({ count: 1 }));

    return { bySource, byType, topClients, vipStats, monthlyAcquisition };
  }

  // ── Lead Analytics ────────────────────────────────────────────────────────

  async getLeadAnalytics(tenantId: string) {
    const [byStatus, bySource, byPriority, avgBudgetByDestination, conversionByAgent] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      this.prisma.lead.groupBy({
        by: ['source'],
        where: { tenantId, deletedAt: null },
        _count: true,
        orderBy: { _count: { source: 'desc' } },
      }),
      this.prisma.lead.groupBy({
        by: ['priority'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      this.prisma.lead.groupBy({
        by: ['destination'],
        where: { tenantId, deletedAt: null, destination: { not: null }, budget: { not: null } },
        _avg: { budget: true },
        _count: true,
        orderBy: { _avg: { budget: 'desc' } },
        take: 10,
      }),
      this.prisma.lead.groupBy({
        by: ['assignedToId', 'status'],
        where: { tenantId, deletedAt: null, assignedToId: { not: null } },
        _count: true,
      }),
    ]);

    const total = byStatus.reduce((s, x) => s + x._count, 0);
    const won = byStatus.find(s => s.status === 'WON')?._count ?? 0;
    const conversionRate = total > 0 ? parseFloat(((won / total) * 100).toFixed(1)) : 0;

    return { byStatus, bySource, byPriority, avgBudgetByDestination, conversionByAgent, conversionRate };
  }

  // ── Forecasts (simple trend) ──────────────────────────────────────────────

  async getForecasts(tenantId: string) {
    const months = 6;
    const from = new Date();
    from.setMonth(from.getMonth() - months);

    const historicalInvoices = await this.prisma.invoice.findMany({
      where: { tenantId, deletedAt: null, issuedAt: { gte: from }, status: { notIn: ['DRAFT', 'CANCELLED'] } },
      select: { issuedAt: true, totalAmount: true },
      orderBy: { issuedAt: 'asc' },
    });

    const monthly = this.groupByMonth(historicalInvoices, i => i.issuedAt!, i => ({ revenue: Number(i.totalAmount) }));

    // Simple linear trend: next 3 months forecast
    const values = Object.values(monthly).map(m => m.revenue);
    const avgGrowth = values.length > 1
      ? values.slice(1).reduce((s, v, i) => s + (v - values[i]) / Math.max(values[i], 1), 0) / (values.length - 1)
      : 0;

    const lastValue = values[values.length - 1] ?? 0;
    const forecast = [1, 2, 3].map(i => {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      return {
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        projected: Math.round(lastValue * (1 + avgGrowth * i)),
      };
    });

    return { historical: monthly, forecast, avgMonthlyGrowthRate: parseFloat((avgGrowth * 100).toFixed(1)) };
  }

  // ── Utility ───────────────────────────────────────────────────────────────

  private groupByMonth<T, R extends Record<string, number>>(
    items: T[],
    getDate: (item: T) => Date,
    getValues: (item: T) => R,
  ): Record<string, R & { month: string }> {
    const result: Record<string, R & { month: string; _count: number }> = {};

    for (const item of items) {
      const d = getDate(item);
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (!result[key]) {
        result[key] = { month: key, _count: 0 } as R & { month: string; _count: number };
      }

      result[key]._count += 1;
      const values = getValues(item);
      for (const [k, v] of Object.entries(values)) {
        (result[key] as Record<string, unknown>)[k] = ((result[key] as Record<string, number>)[k] ?? 0) + (v as number);
      }
    }

    return result;
  }
}
