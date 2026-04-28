'use client';

import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { StatusBadge } from '@/components/ui/status-badge';
import { get, PaginatedResponse } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from '@/lib/constants';
import { Plus, TrendingUp, Target, Euro, Percent } from 'lucide-react';
import { useState } from 'react';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  status: string;
  priority: string;
  source: string;
  destination?: string;
  budget?: number;
  departureDate?: string;
  numberOfPeople?: number;
  assignedTo?: { firstName: string; lastName: string };
  createdAt: string;
}

interface PipelineStats {
  byStatus: Array<{ status: string; _count: number }>;
  conversionRate: string;
  avgBudget: number;
  total: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};
const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Bassa', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente',
};
const PIPELINE_ORDER = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'WON', 'LOST'];

export default function LeadsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: stats } = useQuery({
    queryKey: ['lead-pipeline-stats'],
    queryFn: () => get<PipelineStats>('/leads/stats/pipeline'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['leads', { statusFilter, page }],
    queryFn: () => get<PaginatedResponse<Lead>>('/leads', { status: statusFilter || undefined, page, limit: 15 }),
    placeholderData: (prev) => prev,
  });

  return (
    <>
      <Header title="Lead" subtitle="Pipeline commerciale" />
      <div className="p-6 space-y-6">

        {/* Pipeline stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp size={16} className="text-blue-600" /><p className="text-xs text-gray-500">Totale lead</p></div>
            <p className="text-2xl font-bold text-gray-900">{stats?.total ?? '—'}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1"><Target size={16} className="text-green-600" /><p className="text-xs text-gray-500">Tasso conversione</p></div>
            <p className="text-2xl font-bold text-gray-900">{stats?.conversionRate ? `${stats.conversionRate}%` : '—'}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1"><Euro size={16} className="text-indigo-600" /><p className="text-xs text-gray-500">Budget medio</p></div>
            <p className="text-2xl font-bold text-gray-900">{stats?.avgBudget ? formatCurrency(stats.avgBudget) : '—'}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1"><Percent size={16} className="text-orange-600" /><p className="text-xs text-gray-500">Qualificati</p></div>
            <p className="text-2xl font-bold text-gray-900">{stats?.byStatus?.find(s => s.status === 'QUALIFIED')?._count ?? 0}</p>
          </div>
        </div>

        {/* Pipeline bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-2">
            {PIPELINE_ORDER.map(status => {
              const count = stats?.byStatus?.find(s => s.status === status)?._count ?? 0;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    statusFilter === status ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <StatusBadge label={LEAD_STATUS_LABELS[status]} colorClass={LEAD_STATUS_COLORS[status]} />
                  <span className="font-bold text-gray-900">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              {statusFilter ? `Lead: ${LEAD_STATUS_LABELS[statusFilter]}` : 'Tutti i lead'}
            </h2>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium">
              <Plus size={15} /> Nuovo Lead
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Lead</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Destinazione</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Stato</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Priorità</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Budget</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden xl:table-cell">Agente</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden xl:table-cell">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))}
              {!isLoading && data?.data.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Nessun lead trovato</td></tr>
              )}
              {data?.data.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{lead.firstName} {lead.lastName}</p>
                    <p className="text-xs text-gray-400">{lead.email ?? lead.phone ?? '—'}</p>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <p className="text-sm text-gray-700">{lead.destination ?? '—'}</p>
                    {lead.departureDate && <p className="text-xs text-gray-400">{formatDate(lead.departureDate)}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge
                      label={LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                      colorClass={LEAD_STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'}
                    />
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <StatusBadge
                      label={PRIORITY_LABELS[lead.priority] ?? lead.priority}
                      colorClass={PRIORITY_COLORS[lead.priority] ?? 'bg-gray-100 text-gray-600'}
                    />
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {lead.budget ? formatCurrency(lead.budget) : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden xl:table-cell text-sm text-gray-500">
                    {lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : '—'}
                  </td>
                  <td className="px-6 py-4 hidden xl:table-cell text-sm text-gray-500">
                    {formatDate(lead.createdAt)}
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
