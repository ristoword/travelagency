'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Euro, Users, Briefcase, TrendingUp, Plane,
  FileText, Clock, AlertCircle,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Header } from '@/components/layout/header';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { get } from '@/lib/api';
import { formatCurrency, formatDate, getClientName } from '@/lib/utils';
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, CASE_STATUS_COLORS, CASE_STATUS_LABELS } from '@/lib/constants';
import Link from 'next/link';

const revenueData = [
  { month: 'Nov', fatturato: 29100, incassato: 24000 },
  { month: 'Dic', fatturato: 41500, incassato: 36000 },
  { month: 'Gen', fatturato: 35800, incassato: 31000 },
  { month: 'Feb', fatturato: 38200, incassato: 31000 },
  { month: 'Mar', fatturato: 44700, incassato: 39500 },
  { month: 'Apr', fatturato: 51300, incassato: 44200 },
];

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#06b6d4'];

export default function DashboardPage() {
  const { data: leadStats } = useQuery({
    queryKey: ['lead-stats'],
    queryFn: () => get<{ byStatus: Array<{ status: string; _count: number }> }>('/leads/stats/pipeline'),
  });

  const { data: caseStats } = useQuery({
    queryKey: ['case-stats'],
    queryFn: () => get<{
      byStatus: Array<{ status: string; _count: number }>;
      upcoming: Array<{ id: string; number: string; title: string; departureDate: string; client?: { firstName: string; lastName: string } }>;
    }>('/cases/stats'),
  });

  const { data: quotationStats } = useQuery({
    queryKey: ['quotation-stats'],
    queryFn: () => get<{
      totals: { _sum: { totalAmount: number }; _count: number };
      conversionRate: string;
    }>('/quotations/stats'),
  });

  const { data: invoiceStats } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: () => get<{
      totals: { _sum: { totalAmount: number; balanceDue: number } };
      overdue: { _sum: { balanceDue: number }; _count: number };
    }>('/invoices/stats'),
  });

  const pipelineData = leadStats?.byStatus?.map((s) => ({
    name: LEAD_STATUS_LABELS[s.status] ?? s.status,
    value: s._count,
  })) ?? [];

  return (
    <>
      <Header title="Dashboard" subtitle={`Aggiornato al ${formatDate(new Date())}`} />
      <div className="p-6 space-y-6">

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Fatturato aprile"
            value={formatCurrency(51300)}
            change="+14,7%"
            changePositive
            icon={Euro}
            iconColor="text-green-600"
            iconBg="bg-green-50"
          />
          <StatCard
            title="Lead pipeline"
            value={leadStats?.byStatus?.reduce((s, x) => s + x._count, 0) ?? '—'}
            change="+7 questo mese"
            changePositive
            icon={TrendingUp}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <StatCard
            title="Pratiche attive"
            value={caseStats?.byStatus?.find(s => s.status === 'CONFIRMED')?._count ?? '—'}
            icon={Briefcase}
            iconColor="text-indigo-600"
            iconBg="bg-indigo-50"
          />
          <StatCard
            title="Da incassare"
            value={formatCurrency(invoiceStats?.overdue?._sum?.balanceDue)}
            icon={AlertCircle}
            iconColor="text-orange-600"
            iconBg="bg-orange-50"
          />
        </div>

        {/* Revenue chart + Pipeline donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Andamento ricavi — ultimi 6 mesi</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="fat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Area type="monotone" dataKey="fatturato" stroke="#3b82f6" strokeWidth={2} fill="url(#fat)" name="Fatturato" />
                <Area type="monotone" dataKey="incassato" stroke="#10b981" strokeWidth={2} fill="url(#inc)" name="Incassato" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Lead per stato</h2>
            {pipelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pipelineData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80}>
                    {pipelineData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: '#64748b' }}>{v}</span>} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Nessun dato</div>
            )}
          </div>
        </div>

        {/* Upcoming departures + Recent leads */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Prossime partenze</h2>
              <Link href="/cases" className="text-blue-600 text-sm hover:underline">Vedi tutte →</Link>
            </div>
            <div className="space-y-3">
              {caseStats?.upcoming?.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">Nessuna partenza imminente</p>
              )}
              {caseStats?.upcoming?.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Plane size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                    <p className="text-xs text-gray-500">{c.number} · partenza {formatDate(c.departureDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Pratiche per stato</h2>
              <Link href="/cases" className="text-blue-600 text-sm hover:underline">Gestisci →</Link>
            </div>
            <div className="space-y-2.5">
              {caseStats?.byStatus?.map((s) => (
                <div key={s.status} className="flex items-center justify-between">
                  <StatusBadge
                    label={CASE_STATUS_LABELS[s.status] ?? s.status}
                    colorClass={CASE_STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-600'}
                  />
                  <span className="text-sm font-semibold text-gray-900">{s._count}</span>
                </div>
              )) ?? (
                <p className="text-gray-400 text-sm text-center py-4">Nessun dato</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Nuovo Cliente', href: '/crm/clients', icon: Users, color: 'blue' },
            { label: 'Nuovo Preventivo', href: '/sales/quotations', icon: FileText, color: 'indigo' },
            { label: 'Nuova Pratica', href: '/cases', icon: Briefcase, color: 'violet' },
            { label: 'Nuova Fattura', href: '/accounting/invoices', icon: Euro, color: 'green' },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div className={`w-9 h-9 rounded-lg bg-${action.color}-50 flex items-center justify-center group-hover:bg-${action.color}-100 transition-colors`}>
                <action.icon size={18} className={`text-${action.color}-600`} />
              </div>
              <span className="text-sm font-medium text-gray-700">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
