'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  Euro, Users, Briefcase, TrendingUp, Plane, FileText,
  AlertCircle, ArrowUpRight, ArrowDownRight, CheckSquare,
  BarChart3, Clock, Star,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { get } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, CASE_STATUS_LABELS, CASE_STATUS_COLORS } from '@/lib/constants';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

interface DashboardKpis {
  revenue: { thisMonth: number; lastMonth: number; changePercent: string | null; ytd: number; invoicesCount: number };
  margins: { ytd: number; percent: number };
  leads: { total: number; new: number; won: number; conversionRate: number };
  cases: { active: number; completed: number; upcoming: number };
  clients: { total: number; newThisMonth: number };
  alerts: { bookingsPending: number; overdueInvoices: number; overdueAmount: number };
}

interface SalesAnalytics {
  quotationsByStatus: Array<{ status: string; _count: number; _sum: { totalAmount: number } }>;
  monthlyRevenue: Record<string, { month: string; revenue: number }>;
  topDestinations: Array<{ destination: string; _count: number; _sum: { totalAmount: number } }>;
}

interface LeadStats {
  byStatus: Array<{ status: string; _count: number }>;
  conversionRate: string;
  total: number;
}

function StatCard({ title, value, sub, icon: Icon, change, color, href }: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; change?: string; color: string; href?: string;
}) {
  const positive = change ? !change.startsWith('-') : undefined;
  const content = (
    <div className="card-glow p-5 hover:border-[#243856] transition-all duration-300 group cursor-pointer">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {change}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-0.5 group-hover:text-gradient transition-all">{value}</p>
      <p className="text-xs" style={{ color: 'var(--text-2)' }}>{title}</p>
      {sub && <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: kpis } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => get<DashboardKpis>('/analytics/dashboard'),
    staleTime: 2 * 60 * 1000,
  });

  const { data: sales } = useQuery({
    queryKey: ['sales-analytics'],
    queryFn: () => get<SalesAnalytics>('/analytics/sales', { period: '6M' }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: leadStats } = useQuery({
    queryKey: ['lead-stats'],
    queryFn: () => get<LeadStats>('/leads/stats/pipeline'),
    staleTime: 2 * 60 * 1000,
  });

  const { data: caseStats } = useQuery({
    queryKey: ['case-stats'],
    queryFn: () => get<{
      byStatus: Array<{ status: string; _count: number }>;
      upcoming: Array<{ id: string; number: string; title: string; departureDate: string; destination?: string }>;
    }>('/cases/stats'),
  });

  // Chart data
  const revenueChartData = Object.values(sales?.monthlyRevenue ?? {}).map(m => ({
    month: m.month.slice(5),
    revenue: Math.round(m.revenue),
  }));

  const pipelineData = leadStats?.byStatus?.map(s => ({
    name: LEAD_STATUS_LABELS[s.status] ?? s.status,
    value: s._count,
  })) ?? [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">

        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-2xl p-6 border"
          style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(99,102,241,0.08) 100%)', borderColor: 'rgba(59,130,246,0.2)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 opacity-5 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, #3b82f6, transparent)', transform: 'translate(30%,-30%)' }} />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-2)' }}>
                {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <h2 className="text-xl font-bold text-white">
                {greeting}, {user?.firstName} 👋
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
                {kpis?.alerts.overdueInvoices
                  ? `Hai ${kpis.alerts.overdueInvoices} ${kpis.alerts.overdueInvoices === 1 ? 'fattura scaduta' : 'fatture scadute'} da gestire`
                  : 'Tutto sotto controllo. Buon lavoro!'}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4">
              {kpis?.alerts.overdueInvoices ? (
                <Link href="/accounting/invoices?overdue=true"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertCircle size={14} />
                  {kpis.alerts.overdueInvoices} fatture scadute
                </Link>
              ) : null}
              <Link href="/cases" className="btn-primary text-sm px-4 py-2.5">
                Nuova Pratica
              </Link>
            </div>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Fatturato del mese"
            value={kpis ? formatCurrency(kpis.revenue.thisMonth) : '—'}
            sub={`YTD: ${kpis ? formatCurrency(kpis.revenue.ytd) : '—'}`}
            icon={Euro} color="#3b82f6" href="/accounting/invoices"
            change={kpis?.revenue.changePercent ? `${kpis.revenue.changePercent}% vs mese scorso` : undefined}
          />
          <StatCard
            title="Lead in pipeline"
            value={kpis?.leads.total ?? '—'}
            sub={`${kpis?.leads.new ?? 0} nuovi · ${kpis?.leads.conversionRate ?? 0}% conversione`}
            icon={TrendingUp} color="#8b5cf6" href="/crm/leads"
          />
          <StatCard
            title="Pratiche attive"
            value={kpis?.cases.active ?? '—'}
            sub={`${kpis?.cases.upcoming ?? 0} partenze imminenti`}
            icon={Briefcase} color="#10b981" href="/cases"
          />
          <StatCard
            title="Margine YTD"
            value={kpis ? `${kpis.margins.percent}%` : '—'}
            sub={kpis ? formatCurrency(kpis.margins.ytd) : '—'}
            icon={BarChart3} color="#f59e0b" href="/analytics"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue chart */}
          <div className="lg:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-white">Andamento Ricavi</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Ultimi 6 mesi</p>
              </div>
              <Link href="/analytics" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                Vedi analytics →
              </Link>
            </div>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#4d6a8c' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#4d6a8c' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: 'var(--text-2)' }}
                    itemStyle={{ color: '#60a5fa' }}
                    formatter={(v: number) => [formatCurrency(v), 'Ricavi']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--text-3)' }}>
                Nessun dato disponibile
              </div>
            )}
          </div>

          {/* Pipeline donut */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-white">Pipeline Lead</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Per stato</p>
              </div>
              <Link href="/crm/leads" className="text-xs text-blue-400 hover:text-blue-300">Vedi →</Link>
            </div>
            {pipelineData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pipelineData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70}>
                      {pipelineData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {pipelineData.slice(0, 4).map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-xs" style={{ color: 'var(--text-2)' }}>{d.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-white">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--text-3)' }}>
                Nessun lead
              </div>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Upcoming departures */}
          <div className="lg:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Plane size={14} className="text-blue-400" />
                Prossime Partenze
              </h3>
              <Link href="/cases" className="text-xs text-blue-400 hover:text-blue-300">Vedi tutte →</Link>
            </div>
            <div className="space-y-2">
              {!caseStats?.upcoming?.length ? (
                <div className="py-8 text-center text-sm" style={{ color: 'var(--text-3)' }}>
                  Nessuna partenza imminente
                </div>
              ) : caseStats.upcoming.map(c => (
                <Link href={`/cases/${c.id}`} key={c.id}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-[rgba(255,255,255,0.03)] group"
                  style={{ background: 'var(--bg-card)' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(59,130,246,0.12)' }}>
                    <Plane size={14} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors">
                      {c.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                      {c.number} · {c.destination ?? 'N/D'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-white">{formatDate(c.departureDate)}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full badge-blue">Confermata</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Actions + Alerts */}
          <div className="space-y-4">
            {/* Alerts */}
            {(kpis?.alerts.overdueInvoices ?? 0) > 0 && (
              <div className="card p-4 border-red-500/20" style={{ borderColor: 'rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.04)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={13} className="text-red-400" />
                  <p className="text-xs font-semibold text-red-400">Attenzione</p>
                </div>
                <p className="text-sm font-bold text-white">{kpis?.alerts.overdueInvoices} fatture scadute</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                  {formatCurrency(kpis?.alerts.overdueAmount ?? 0)} da incassare
                </p>
                <Link href="/accounting/invoices?overdue=true"
                  className="mt-3 text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                  Gestisci ora →
                </Link>
              </div>
            )}

            {/* Quick Actions */}
            <div className="card p-4">
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-2)' }}>Azioni Rapide</p>
              <div className="space-y-1.5">
                {[
                  { icon: Users, label: 'Nuovo Cliente', href: '/crm/clients', color: '#8b5cf6' },
                  { icon: FileText, label: 'Nuovo Preventivo', href: '/sales/quotations', color: '#06b6d4' },
                  { icon: Briefcase, label: 'Nuova Pratica', href: '/cases', color: '#10b981' },
                  { icon: Euro, label: 'Nuova Fattura', href: '/accounting/invoices', color: '#f59e0b' },
                ].map(a => (
                  <Link key={a.label} href={a.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-[rgba(255,255,255,0.04)] group">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: `${a.color}15` }}>
                      <a.icon size={13} style={{ color: a.color }} />
                    </div>
                    <span className="text-xs font-medium group-hover:text-white transition-colors" style={{ color: 'var(--text-2)' }}>
                      {a.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Mini stats */}
            <div className="card p-4">
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-2)' }}>Riepilogo</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Clienti totali', value: kpis?.clients.total ?? '—', icon: Users, color: '#8b5cf6' },
                  { label: 'Nuovi questo mese', value: kpis?.clients.newThisMonth ?? '—', icon: Star, color: '#f59e0b' },
                  { label: 'Prenotazioni pending', value: kpis?.alerts.bookingsPending ?? '—', icon: Clock, color: '#06b6d4' },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <s.icon size={12} style={{ color: s.color }} />
                      <span className="text-xs" style={{ color: 'var(--text-2)' }}>{s.label}</span>
                    </div>
                    <span className="text-xs font-bold text-white">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
