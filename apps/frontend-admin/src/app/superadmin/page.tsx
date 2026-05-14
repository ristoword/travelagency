'use client';

import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { Building2, Users, CheckCircle, XCircle, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';

interface SuperAdminStats {
  tenants: {
    total: number; active: number; suspended: number; trial: number;
    planDistribution: Array<{ plan: string; _count: number }>;
  };
  users: { total: number; active: number; blocked: number };
  recentTenants: Array<{
    id: string; name: string; slug: string; plan: string;
    isActive: boolean; isVerified: boolean; createdAt: string; email?: string;
  }>;
}

const PLAN_COLORS: Record<string, string> = {
  STARTER: '#4d6a8c', PROFESSIONAL: '#3b82f6', ENTERPRISE: '#8b5cf6',
};
const PLAN_LABELS: Record<string, string> = {
  STARTER: 'Starter', PROFESSIONAL: 'Professional', ENTERPRISE: 'Enterprise',
};

export default function SuperAdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['sa-stats'],
    queryFn: () => get<SuperAdminStats>('/superadmin/stats'),
    refetchInterval: 30_000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-full" style={{ color: '#4d6a8c' }}>
      Caricamento...
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard SuperAdmin</h1>
        <p className="text-sm mt-0.5" style={{ color: '#4d6a8c' }}>Panoramica della piattaforma</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tenant totali', value: stats?.tenants.total ?? 0, icon: Building2, color: '#3b82f6', sub: `${stats?.tenants.active} attivi` },
          { label: 'Tenant sospesi', value: stats?.tenants.suspended ?? 0, icon: XCircle, color: '#ef4444', sub: `${stats?.tenants.trial} in trial` },
          { label: 'Utenti totali', value: stats?.users.total ?? 0, icon: Users, color: '#10b981', sub: `${stats?.users.active} attivi` },
          { label: 'Utenti bloccati', value: stats?.users.blocked ?? 0, icon: XCircle, color: '#f59e0b', sub: 'da sbloccare' },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="p-5 rounded-2xl border" style={{ background: '#080f1e', borderColor: '#0d1f3c' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}18` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs mt-0.5 font-medium" style={{ color: '#8ca4c8' }}>{label}</p>
            <p className="text-[11px] mt-1" style={{ color: '#4d6a8c' }}>{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan distribution */}
        <div className="p-5 rounded-2xl border" style={{ background: '#080f1e', borderColor: '#0d1f3c' }}>
          <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={14} style={{ color: '#7c3aed' }} /> Distribuzione piani
          </p>
          <div className="space-y-3">
            {stats?.tenants.planDistribution.map(p => (
              <div key={p.plan} className="flex items-center gap-3">
                <span className="text-xs font-medium w-24 text-white">{PLAN_LABELS[p.plan] ?? p.plan}</span>
                <div className="flex-1 h-2 rounded-full" style={{ background: '#0d1f3c' }}>
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.min(100, (p._count / (stats.tenants.total || 1)) * 100)}%`,
                    background: PLAN_COLORS[p.plan] ?? '#4d6a8c',
                  }} />
                </div>
                <span className="text-xs font-bold text-white w-6 text-right">{p._count}</span>
              </div>
            )) ?? <p className="text-sm" style={{ color: '#4d6a8c' }}>Nessun dato</p>}
          </div>
        </div>

        {/* Recent tenants */}
        <div className="p-5 rounded-2xl border" style={{ background: '#080f1e', borderColor: '#0d1f3c' }}>
          <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Clock size={14} style={{ color: '#3b82f6' }} /> Tenant recenti
          </p>
          <div className="space-y-2">
            {stats?.recentTenants.map(t => (
              <Link key={t.id} href={`/superadmin/tenants?highlight=${t.id}`}
                className="flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-[#0d1f3c]">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: PLAN_COLORS[t.plan] ?? '#4d6a8c' }}>
                  {t.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{t.name}</p>
                  <p className="text-xs font-mono truncate" style={{ color: '#4d6a8c' }}>{t.slug}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {t.isVerified
                    ? <CheckCircle size={12} className="text-emerald-400" />
                    : <Clock size={12} style={{ color: '#4d6a8c' }} />}
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${t.isActive ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                    {t.isActive ? 'Attivo' : 'Sospeso'}
                  </span>
                </div>
              </Link>
            )) ?? <p className="text-sm" style={{ color: '#4d6a8c' }}>Nessun tenant</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
