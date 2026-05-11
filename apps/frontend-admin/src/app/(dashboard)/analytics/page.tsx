'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { Header } from '@/components/layout/header';
import { get } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, Euro, Users, Target, BarChart3, Globe } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

type Period = '1M' | '3M' | '6M' | '12M';

interface SalesAnalytics {
  quotationsByStatus: Array<{ status: string; _count: number; _sum: { totalAmount: number } }>;
  monthlyRevenue: Record<string, { month: string; revenue: number }>;
  topDestinations: Array<{ destination: string; _count: number; _sum: { totalAmount: number } }>;
}
interface MarginAnalytics {
  byServiceType: Array<{ type: string; _count: number; _sum: { marginAmount: number } }>;
  overall: { totalRevenue: number; totalCost: number; totalMargin: number; marginPercent: number };
}
interface ClientAnalytics {
  bySource: Array<{ source: string; _count: number }>;
  byType: Array<{ type: string; _count: number }>;
  topSpenders: Array<{ id: string; firstName?: string; lastName?: string; companyName?: string; totalSpent: number }>;
}
interface Forecast {
  historical: Array<{ month: string; revenue: number }>;
  forecast: Array<{ month: string; projected: number; lower: number; upper: number }>;
}

const MONTH_IT: Record<string, string> = {
  '01': 'Gen', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'Mag', '06': 'Giu',
  '07': 'Lug', '08': 'Ago', '09': 'Set', '10': 'Ott', '11': 'Nov', '12': 'Dic',
};
function fmtMonth(m: string) {
  const [y, mo] = m.split('-');
  return `${MONTH_IT[mo] ?? mo} ${y?.slice(2)}`;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('6M');

  const { data: sales } = useQuery({
    queryKey: ['analytics-sales', period],
    queryFn: () => get<SalesAnalytics>('/analytics/sales', { period }),
  });
  const { data: margins } = useQuery({
    queryKey: ['analytics-margins'],
    queryFn: () => get<MarginAnalytics>('/analytics/margins'),
  });
  const { data: clients } = useQuery({
    queryKey: ['analytics-clients'],
    queryFn: () => get<ClientAnalytics>('/analytics/clients'),
  });
  const { data: forecast } = useQuery({
    queryKey: ['analytics-forecasts'],
    queryFn: () => get<Forecast>('/analytics/forecasts'),
  });

  const revenueData = Object.values(sales?.monthlyRevenue ?? {}).map(r => ({
    ...r, month: fmtMonth(r.month),
  }));

  const forecastData = [
    ...(forecast?.historical ?? []).map(h => ({ month: fmtMonth(h.month), storico: h.revenue })),
    ...(forecast?.forecast ?? []).map(f => ({ month: fmtMonth(f.month), previsione: f.projected, min: f.lower, max: f.upper })),
  ];

  return (
    <>
      <Header title="Analytics" subtitle="Dashboard KPI" />
      <div className="p-6 space-y-6">

        {/* Period selector */}
        <div className="flex items-center gap-2">
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Periodo:</p>
          {(['1M', '3M', '6M', '12M'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === p ? 'bg-blue-600 text-white' : 'text-[#8ca4c8] hover:bg-[#1a2740]'}`}>
              {p}
            </button>
          ))}
        </div>

        {/* Margin KPIs */}
        {margins?.overall && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Fatturato totale', value: margins.overall.totalRevenue, icon: Euro, color: '#3b82f6', fmt: 'cur' },
              { label: 'Costi totali', value: margins.overall.totalCost, icon: TrendingUp, color: '#ef4444', fmt: 'cur' },
              { label: 'Margine totale', value: margins.overall.totalMargin, icon: BarChart3, color: '#10b981', fmt: 'cur' },
              { label: '% Margine', value: `${Number(margins.overall.marginPercent).toFixed(1)}%`, icon: Target, color: '#8b5cf6', fmt: 'str' },
            ].map(({ label, value, icon: Icon, color, fmt }) => (
              <div key={label} className="card-glow p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">
                  {fmt === 'cur' ? formatCurrency(Number(value)) : value}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Revenue chart */}
        <div className="card p-5">
          <p className="text-sm font-semibold text-white mb-4">Fatturato mensile</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3050" />
              <XAxis dataKey="month" tick={{ fill: '#4d6a8c', fontSize: 11 }} />
              <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fill: '#4d6a8c', fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#162035', border: '1px solid #1e3050', borderRadius: 8 }} labelStyle={{ color: '#f0f4ff' }} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#rev)" name="Fatturato" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top destinations */}
          <div className="card p-5">
            <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Globe size={14} style={{ color: '#3b82f6' }} /> Top destinazioni
            </p>
            {sales?.topDestinations?.length ? (
              <div className="space-y-3">
                {sales.topDestinations.slice(0, 8).map((d, i) => (
                  <div key={d.destination} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-5 text-center" style={{ color: 'var(--text-3)' }}>{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-white">{d.destination || '(non specificata)'}</span>
                        <span className="text-xs" style={{ color: 'var(--text-2)' }}>{d._count} pratiche</span>
                      </div>
                      <div className="w-full h-1 rounded-full bg-[#1e3050]">
                        <div className="h-full rounded-full" style={{
                          width: `${Math.min(100, (d._count / (sales.topDestinations[0]?._count || 1)) * 100)}%`,
                          background: COLORS[i % COLORS.length],
                        }} />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-white text-right w-20">{formatCurrency(Number(d._sum?.totalAmount ?? 0))}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>Nessun dato disponibile</p>}
          </div>

          {/* Client sources */}
          <div className="card p-5">
            <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Users size={14} style={{ color: '#8b5cf6' }} /> Clienti per fonte
            </p>
            {clients?.bySource?.length ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={clients.bySource} dataKey="_count" nameKey="source" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                      {clients.bySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, name: string) => [v, name]} contentStyle={{ background: '#162035', border: '1px solid #1e3050', borderRadius: 8 }} />
                    <Legend formatter={(v) => <span style={{ color: '#8ca4c8', fontSize: 11 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>Nessun dato disponibile</p>}
          </div>
        </div>

        {/* Forecast */}
        {forecastData.length > 0 && (
          <div className="card p-5">
            <p className="text-sm font-semibold text-white mb-1">Previsione fatturato</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>Storico + proiezione 3 mesi (regressione lineare su dati reali)</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3050" />
                <XAxis dataKey="month" tick={{ fill: '#4d6a8c', fontSize: 11 }} />
                <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fill: '#4d6a8c', fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#162035', border: '1px solid #1e3050', borderRadius: 8 }} labelStyle={{ color: '#f0f4ff' }} />
                <Line type="monotone" dataKey="storico" stroke="#3b82f6" strokeWidth={2} dot={false} name="Storico" />
                <Line type="monotone" dataKey="previsione" stroke="#10b981" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Previsione" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Margins by service type */}
        {margins?.byServiceType?.length ? (
          <div className="card p-5">
            <p className="text-sm font-semibold text-white mb-4">Margine per tipo di servizio</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={margins.byServiceType}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3050" />
                <XAxis dataKey="type" tick={{ fill: '#4d6a8c', fontSize: 11 }} />
                <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fill: '#4d6a8c', fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#162035', border: '1px solid #1e3050', borderRadius: 8 }} labelStyle={{ color: '#f0f4ff' }} />
                <Bar dataKey="_sum.marginAmount" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Margine" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>
    </>
  );
}
