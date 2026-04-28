'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { StatusBadge } from '@/components/ui/status-badge';
import { get, PaginatedResponse } from '@/lib/api';
import { formatCurrency, formatDate, getClientName } from '@/lib/utils';
import { BOOKING_TYPE_LABELS, BOOKING_TYPE_ICONS } from '@/lib/constants';
import { Search, Plus, CheckCircle } from 'lucide-react';

interface Booking {
  id: string;
  number: string;
  type: string;
  status: string;
  description: string;
  supplierName?: string;
  confirmationCode?: string;
  serviceDate?: string;
  amount: string;
  currency: string;
  marginAmount: string;
  marginPercent: string;
  isPaidToSupplier: boolean;
  client?: { firstName?: string; lastName?: string; companyName?: string };
  case?: { number: string; title: string };
}

const BOOKING_STATUS_LABELS: Record<string, string> = { ON_REQUEST: 'Su richiesta', PENDING: 'In attesa', CONFIRMED: 'Confermato', CANCELLED: 'Annullato', REFUNDED: 'Rimborsato', NO_SHOW: 'No show' };
const BOOKING_STATUS_COLORS: Record<string, string> = { ON_REQUEST: 'bg-yellow-100 text-yellow-700', PENDING: 'bg-blue-100 text-blue-700', CONFIRMED: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700', REFUNDED: 'bg-purple-100 text-purple-700', NO_SHOW: 'bg-gray-100 text-gray-600' };

export default function BookingsPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', { search, type, status, page }],
    queryFn: () => get<PaginatedResponse<Booking>>('/bookings', { search, type: type || undefined, status: status || undefined, page, limit: 20 }),
    placeholderData: (prev) => prev,
  });

  return (
    <>
      <Header title="Prenotazioni" subtitle={`${data?.meta.total ?? 0} prenotazioni`} />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cerca numero, fornitore, codice conferma..." className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
            <option value="">Tutti i tipi</option>
            {Object.entries(BOOKING_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
            <option value="">Tutti gli stati</option>
            {Object.entries(BOOKING_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap">
            <Plus size={16} /> Nuova Prenotazione
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Prenotazione</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Fornitore</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Stato</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Data servizio</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Prezzo</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase hidden xl:table-cell">Pagato forn.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((__, j) => <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>
              ))}
              {!isLoading && data?.data.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Nessuna prenotazione trovata</td></tr>}
              {data?.data.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl" title={BOOKING_TYPE_LABELS[b.type]}>{BOOKING_TYPE_ICONS[b.type] ?? '📌'}</span>
                      <div>
                        <p className="text-sm font-semibold text-blue-600">{b.number}</p>
                        <p className="text-xs text-gray-700 truncate max-w-44">{b.description}</p>
                        {b.case && <p className="text-xs text-gray-400">{b.case.number}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <p className="text-sm text-gray-700">{b.supplierName ?? '—'}</p>
                    {b.confirmationCode && <p className="text-xs text-gray-400 font-mono">{b.confirmationCode}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge label={BOOKING_STATUS_LABELS[b.status] ?? b.status} colorClass={BOOKING_STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'} />
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell text-sm text-gray-500">{formatDate(b.serviceDate)}</td>
                  <td className="px-6 py-4 hidden lg:table-cell text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(b.amount), b.currency)}</p>
                    <p className="text-xs text-green-600">+{formatCurrency(Number(b.marginAmount))} ({Number(b.marginPercent).toFixed(1)}%)</p>
                  </td>
                  <td className="px-6 py-4 hidden xl:table-cell text-center">
                    {b.isPaidToSupplier ? <CheckCircle size={16} className="text-green-500 mx-auto" /> : <div className="w-4 h-4 border-2 border-gray-300 rounded-full mx-auto" />}
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
