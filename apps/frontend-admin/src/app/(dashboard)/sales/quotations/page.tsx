'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { StatusBadge } from '@/components/ui/status-badge';
import { get, PaginatedResponse } from '@/lib/api';
import { formatCurrency, formatDate, getClientName, truncate } from '@/lib/utils';
import { QUOTATION_STATUS_LABELS, QUOTATION_STATUS_COLORS } from '@/lib/constants';
import { Search, Plus, FileText, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

interface Quotation {
  id: string;
  number: string;
  status: string;
  destination?: string;
  departureDate?: string;
  numberOfPeople?: number;
  currency: string;
  totalAmount: string;
  totalMargin: string;
  marginPercent: string;
  validUntil?: string;
  createdAt: string;
  client?: { id: string; firstName?: string; lastName?: string; companyName?: string };
  lead?: { id: string; firstName: string; lastName: string };
  assignedTo?: { firstName: string; lastName: string };
  _count: { items: number };
}

interface QuotationStats {
  totals: { _sum: { totalAmount: number; totalMargin: number }; _count: number };
  conversionRate: string;
  byStatus: Array<{ status: string; _count: number; _sum: { totalAmount: number } }>;
}

export default function QuotationsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data: stats } = useQuery({
    queryKey: ['quotation-stats'],
    queryFn: () => get<QuotationStats>('/quotations/stats'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', { search, status, page }],
    queryFn: () => get<PaginatedResponse<Quotation>>('/quotations', { search, status: status || undefined, page, limit: 20 }),
    placeholderData: (prev) => prev,
  });

  const getCustomerName = (q: Quotation) =>
    q.client ? getClientName(q.client) : q.lead ? `${q.lead.firstName} ${q.lead.lastName}` : '—';

  return (
    <>
      <Header title="Preventivi" subtitle={`${data?.meta.total ?? 0} preventivi`} />
      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1"><FileText size={15} className="text-blue-600" /><p className="text-xs text-gray-500">Totale</p></div>
            <p className="text-2xl font-bold">{stats?.totals._count ?? '—'}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1"><CheckCircle size={15} className="text-green-600" /><p className="text-xs text-gray-500">Accettati</p></div>
            <p className="text-2xl font-bold text-green-700">{stats?.byStatus?.find(s => s.status === 'ACCEPTED')?._count ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp size={15} className="text-indigo-600" /><p className="text-xs text-gray-500">Valore totale</p></div>
            <p className="text-xl font-bold">{formatCurrency(Number(stats?.totals._sum?.totalAmount))}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1"><Clock size={15} className="text-orange-600" /><p className="text-xs text-gray-500">Conversione</p></div>
            <p className="text-2xl font-bold">{stats?.conversionRate ? `${stats.conversionRate}%` : '—'}</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cerca per numero, destinazione, cliente..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutti gli stati</option>
            {Object.entries(QUOTATION_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <Link
            href="/sales/quotations/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            <Plus size={16} /> Nuovo Preventivo
          </Link>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Numero</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Destinazione</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Stato</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Totale</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden xl:table-cell">Margine</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden xl:table-cell">Scadenza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))}
              {!isLoading && data?.data.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Nessun preventivo trovato</td></tr>
              )}
              {data?.data.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/sales/quotations/${q.id}`} className="text-sm font-semibold text-blue-600 hover:underline">
                      {q.number}
                    </Link>
                    <p className="text-xs text-gray-400">{q._count.items} servizi · {formatDate(q.createdAt)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{getCustomerName(q)}</p>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <p className="text-sm text-gray-700">{truncate(q.destination, 30) ?? '—'}</p>
                    {q.departureDate && <p className="text-xs text-gray-400">{formatDate(q.departureDate)}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge
                      label={QUOTATION_STATUS_LABELS[q.status] ?? q.status}
                      colorClass={QUOTATION_STATUS_COLORS[q.status] ?? 'bg-gray-100 text-gray-600'}
                    />
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(q.totalAmount), q.currency)}</p>
                  </td>
                  <td className="px-6 py-4 hidden xl:table-cell text-right">
                    <p className="text-sm font-medium text-green-700">{formatCurrency(Number(q.totalMargin))}</p>
                    <p className="text-xs text-gray-400">{Number(q.marginPercent).toFixed(1)}%</p>
                  </td>
                  <td className="px-6 py-4 hidden xl:table-cell">
                    <span className={`text-sm ${q.validUntil && new Date(q.validUntil) < new Date() ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {formatDate(q.validUntil)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {(page - 1) * 20 + 1}–{Math.min(page * 20, data.meta.total)} di {data.meta.total}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => p - 1)} disabled={!data.meta.hasPrevPage}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prec</button>
                <button onClick={() => setPage(p => p + 1)} disabled={!data.meta.hasNextPage}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Succ →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
