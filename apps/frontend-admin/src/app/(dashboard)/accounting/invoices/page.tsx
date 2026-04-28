'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { StatusBadge } from '@/components/ui/status-badge';
import { get, PaginatedResponse } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from '@/lib/constants';
import { Search, Plus, AlertTriangle, Euro, TrendingDown } from 'lucide-react';

interface Invoice {
  id: string;
  number: string;
  type: string;
  status: string;
  issuedAt?: string;
  dueDate?: string;
  currency: string;
  totalAmount: string;
  paidAmount: string;
  balanceDue: string;
  clientName?: string;
  client?: { firstName?: string; lastName?: string; companyName?: string };
}

interface InvoiceStats {
  totals: { _sum: { totalAmount: number; paidAmount: number; balanceDue: number }; _count: number };
  overdue: { _sum: { balanceDue: number }; _count: number };
}

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data: stats } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: () => get<InvoiceStats>('/invoices/stats'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { search, status, page }],
    queryFn: () => get<PaginatedResponse<Invoice>>('/invoices', { search, status: status || undefined, page, limit: 20 }),
    placeholderData: (prev) => prev,
  });

  return (
    <>
      <Header title="Fatture" subtitle={`${data?.meta.total ?? 0} fatture`} />
      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1"><Euro size={15} className="text-blue-600" /><p className="text-xs text-gray-500">Fatturato totale</p></div>
            <p className="text-xl font-bold">{formatCurrency(Number(stats?.totals._sum?.totalAmount))}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingDown size={15} className="text-green-600" /><p className="text-xs text-gray-500">Incassato</p></div>
            <p className="text-xl font-bold text-green-700">{formatCurrency(Number(stats?.totals._sum?.paidAmount))}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1"><Euro size={15} className="text-orange-600" /><p className="text-xs text-gray-500">Da incassare</p></div>
            <p className="text-xl font-bold text-orange-700">{formatCurrency(Number(stats?.totals._sum?.balanceDue))}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 border-red-200 bg-red-50">
            <div className="flex items-center gap-2 mb-1"><AlertTriangle size={15} className="text-red-600" /><p className="text-xs text-red-600">Scadute</p></div>
            <p className="text-xl font-bold text-red-700">{formatCurrency(Number(stats?.overdue._sum?.balanceDue))}</p>
            <p className="text-xs text-red-500">{stats?.overdue._count ?? 0} fatture</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cerca per numero, cliente..." className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
            <option value="">Tutti gli stati</option>
            {Object.entries(INVOICE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap">
            <Plus size={16} /> Nuova Fattura
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Numero</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Cliente</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Stato</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Emessa</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Scadenza</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Totale</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden xl:table-cell">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((__, j) => <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>
              ))}
              {!isLoading && data?.data.length === 0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Nessuna fattura trovata</td></tr>}
              {data?.data.map((inv) => {
                const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date() && !['PAID', 'CANCELLED'].includes(inv.status);
                return (
                  <tr key={inv.id} className={`hover:bg-gray-50 transition-colors ${isOverdue ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-blue-600">{inv.number}</p>
                      <p className="text-xs text-gray-400">{inv.type === 'INVOICE' ? 'Fattura' : inv.type === 'PROFORMA' ? 'Proforma' : 'Ricevuta'}</p>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-sm text-gray-900">{inv.clientName ?? '—'}</td>
                    <td className="px-6 py-4">
                      <StatusBadge label={INVOICE_STATUS_LABELS[inv.status] ?? inv.status} colorClass={INVOICE_STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'} />
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell text-sm text-gray-500">{formatDate(inv.issuedAt)}</td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                        {formatDate(inv.dueDate)} {isOverdue && '⚠️'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{formatCurrency(Number(inv.totalAmount), inv.currency)}</td>
                    <td className="px-6 py-4 hidden xl:table-cell text-right">
                      <span className={`text-sm font-medium ${Number(inv.balanceDue) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {Number(inv.balanceDue) > 0 ? formatCurrency(Number(inv.balanceDue)) : 'Pagata ✓'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
