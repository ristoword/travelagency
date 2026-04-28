'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { StatusBadge } from '@/components/ui/status-badge';
import { get, PaginatedResponse } from '@/lib/api';
import { formatCurrency, formatDate, getClientName } from '@/lib/utils';
import { CASE_STATUS_LABELS, CASE_STATUS_COLORS } from '@/lib/constants';
import { Search, Plus, Plane, Users, CheckSquare } from 'lucide-react';

interface TravelCase {
  id: string;
  number: string;
  title: string;
  status: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  numberOfPeople?: number;
  totalAmount: string;
  totalPaid: string;
  balance: string;
  createdAt: string;
  client?: { firstName?: string; lastName?: string; companyName?: string };
  assignedTo?: { firstName: string; lastName: string };
  _count: { passengers: number; services: number; checklists: number };
}

export default function CasesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['cases', { search, status, page }],
    queryFn: () => get<PaginatedResponse<TravelCase>>('/cases', { search, status: status || undefined, page, limit: 20 }),
    placeholderData: (prev) => prev,
  });

  return (
    <>
      <Header title="Pratiche Viaggio" subtitle={`${data?.meta.total ?? 0} pratiche`} />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cerca pratica, cliente, destinazione..." className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
            <option value="">Tutti gli stati</option>
            {Object.entries(CASE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap">
            <Plus size={16} /> Nuova Pratica
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Pratica</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Destinazione</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Stato</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Dettagli</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Valore</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 5 }).map((__, j) => <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>
              ))}
              {!isLoading && data?.data.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Nessuna pratica trovata</td></tr>
              )}
              {data?.data.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-blue-600">{c.number}</p>
                    <p className="text-sm text-gray-900 font-medium truncate max-w-48">{c.title}</p>
                    <p className="text-xs text-gray-400">{c.client ? getClientName(c.client) : '—'}</p>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <Plane size={14} className="text-blue-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-700">{c.destination ?? '—'}</p>
                        {c.departureDate && <p className="text-xs text-gray-400">{formatDate(c.departureDate)} → {formatDate(c.returnDate)}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge label={CASE_STATUS_LABELS[c.status] ?? c.status} colorClass={CASE_STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'} />
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Users size={12} />{c._count.passengers} pax</span>
                      <span className="flex items-center gap-1"><Plane size={12} />{c._count.services} servizi</span>
                      <span className="flex items-center gap-1"><CheckSquare size={12} />{c._count.checklists} task</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(c.totalAmount))}</p>
                    <p className="text-xs text-orange-600">Saldo: {formatCurrency(Number(c.balance))}</p>
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
