'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { get, PaginatedResponse } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, TrendingUp, Target, DollarSign, Clock } from 'lucide-react';

const STAGE_LABELS: Record<string, string> = {
  PROSPECTING: 'Prospecting', QUALIFICATION: 'Qualifica', NEEDS_ANALYSIS: 'Analisi',
  PROPOSAL: 'Proposta', NEGOTIATION: 'Negoziazione', CLOSED_WON: 'Vinto', CLOSED_LOST: 'Perso',
};
const STAGE_COLORS: Record<string, string> = {
  PROSPECTING: 'badge-gray', QUALIFICATION: 'badge-blue', NEEDS_ANALYSIS: 'badge-blue',
  PROPOSAL: 'badge-yellow', NEGOTIATION: 'badge-yellow', CLOSED_WON: 'badge-green', CLOSED_LOST: 'badge-red',
};

interface Opportunity {
  id: string; title: string; stage: string; probability: number;
  estimatedValue: number; currency: string; expectedCloseDate?: string;
  client?: { firstName?: string; lastName?: string; companyName?: string };
  assignedTo?: { firstName: string; lastName: string };
}
interface PipelineStats {
  byStage: Array<{ stage: string; _count: number; _sum: { estimatedValue: number } }>;
  totalWeightedValue: number; totalCount: number;
}

export default function OpportunitiesPage() {
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['opportunities-pipeline'],
    queryFn: () => get<PipelineStats>('/opportunities/stats/pipeline'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['opportunities', { search, stage }],
    queryFn: () => get<PaginatedResponse<Opportunity>>('/opportunities', {
      search: search || undefined, stage: stage || undefined, limit: 50,
    }),
    placeholderData: (prev) => prev,
  });

  const openStages = ['PROSPECTING','QUALIFICATION','NEEDS_ANALYSIS','PROPOSAL','NEGOTIATION'];
  const totalOpen = stats?.byStage.filter(s => openStages.includes(s.stage))
    .reduce((a, s) => a + s._count, 0) ?? 0;
  const totalValue = stats?.byStage.filter(s => openStages.includes(s.stage))
    .reduce((a, s) => a + (s._sum.estimatedValue ?? 0), 0) ?? 0;
  const wonCount = stats?.byStage.find(s => s.stage === 'CLOSED_WON')?._count ?? 0;

  return (
    <>
      <Header title="Opportunità" subtitle={`${data?.meta.total ?? 0} opportunità`} />
      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Pipeline aperta', value: totalOpen, icon: Target, color: '#3b82f6', fmt: 'num' },
            { label: 'Valore pipeline', value: totalValue, icon: DollarSign, color: '#10b981', fmt: 'cur' },
            { label: 'Valore pesato', value: stats?.totalWeightedValue ?? 0, icon: TrendingUp, color: '#8b5cf6', fmt: 'cur' },
            { label: 'Chiuse vinte', value: wonCount, icon: Clock, color: '#f59e0b', fmt: 'num' },
          ].map(({ label, value, icon: Icon, color, fmt }) => (
            <div key={label} className="card-glow p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                  <Icon size={15} style={{ color }} />
                </div>
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>{label}</p>
              </div>
              <p className="text-xl font-bold text-white">
                {fmt === 'cur' ? formatCurrency(Number(value)) : value}
              </p>
            </div>
          ))}
        </div>

        {/* Pipeline mini view */}
        {stats?.byStage && (
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Pipeline per fase</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
              {Object.entries(STAGE_LABELS).map(([key, label]) => {
                const s = stats.byStage.find(x => x.stage === key);
                return (
                  <button key={key} onClick={() => setStage(stage === key ? '' : key)}
                    className={`p-3 rounded-xl border text-center transition-all ${stage === key ? 'border-blue-500 bg-blue-500/10' : 'border-[#1e3050] hover:border-[#243856]'}`}>
                    <p className="text-lg font-bold text-white">{s?._count ?? 0}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>{label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca opportunità..."
              className="input-dark w-full pl-9" />
          </div>
          <select value={stage} onChange={e => setStage(e.target.value)} className="input-dark">
            <option value="">Tutte le fasi</option>
            {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                {['Titolo', 'Fase', 'Cliente', 'Valore', 'Probabilità', 'Chiusura', 'Agente'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-3)' }}>Caricamento...</td></tr>
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-3)' }}>Nessuna opportunità trovata</td></tr>
              ) : data?.data.map(o => (
                <tr key={o.id} className="border-b hover:bg-[#1a2740] transition-colors" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-3 font-medium text-white">{o.title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STAGE_COLORS[o.stage] ?? 'badge-gray'}`}>
                      {STAGE_LABELS[o.stage] ?? o.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {o.client?.companyName ?? `${o.client?.firstName ?? ''} ${o.client?.lastName ?? ''}`.trim() || '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">{formatCurrency(Number(o.estimatedValue))}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-[#1e3050]">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${o.probability}%` }} />
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-2)' }}>{o.probability}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{o.expectedCloseDate ? formatDate(o.expectedCloseDate) : '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>
                    {o.assignedTo ? `${o.assignedTo.firstName} ${o.assignedTo.lastName}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
