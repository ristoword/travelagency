'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { StatusBadge } from '@/components/ui/status-badge';
import { get, PaginatedResponse } from '@/lib/api';
import { formatCurrency, formatDate, getClientName, getInitials } from '@/lib/utils';
import { Search, Plus, Star, Phone, Mail, Filter } from 'lucide-react';
import Link from 'next/link';

interface Client {
  id: string;
  type: string;
  status: string;
  source: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  city?: string;
  isVip: boolean;
  totalBookings: number;
  totalSpent: string;
  createdAt: string;
  tags: Array<{ tag: { name: string; color: string } }>;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-600',
  BLACKLISTED: 'bg-red-100 text-red-700',
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Attivo', INACTIVE: 'Inattivo', BLACKLISTED: 'Blacklist',
};
const TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: 'Privato', COMPANY: 'Azienda', FAMILY: 'Famiglia',
};

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', { search, status, page }],
    queryFn: () => get<PaginatedResponse<Client>>('/clients', { search, status, page, limit: 20 }),
    placeholderData: (prev) => prev,
  });

  return (
    <>
      <Header title="Clienti" subtitle={`${data?.meta.total ?? 0} clienti totali`} />
      <div className="p-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cerca per nome, email, telefono..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutti gli stati</option>
            <option value="ACTIVE">Attivo</option>
            <option value="INACTIVE">Inattivo</option>
            <option value="BLACKLISTED">Blacklist</option>
          </select>
          <Link
            href="/crm/clients/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            <Plus size={16} /> Nuovo Cliente
          </Link>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Tipo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stato</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Tag</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Totale speso</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Aggiunto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))}
              {!isLoading && data?.data.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Nessun cliente trovato</td></tr>
              )}
              {data?.data.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-6 py-4">
                    <Link href={`/crm/clients/${client.id}`} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                        {getInitials(client.firstName, client.lastName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-900">{getClientName(client)}</span>
                          {client.isVip && <Star size={12} className="text-amber-500 fill-amber-500" />}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {client.email && <span className="text-xs text-gray-400 flex items-center gap-1"><Mail size={10} />{client.email}</span>}
                          {client.phone && <span className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} />{client.phone}</span>}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className="text-sm text-gray-600">{TYPE_LABELS[client.type] ?? client.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge
                      label={STATUS_LABELS[client.status] ?? client.status}
                      colorClass={STATUS_COLORS[client.status] ?? 'bg-gray-100 text-gray-600'}
                    />
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {client.tags.slice(0, 3).map(({ tag }) => (
                        <span key={tag.name} className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell text-right">
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(Number(client.totalSpent))}</div>
                    <div className="text-xs text-gray-400">{client.totalBookings} pratiche</div>
                  </td>
                  <td className="px-6 py-4 hidden xl:table-cell text-sm text-gray-500">
                    {formatDate(client.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {data && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {(page - 1) * 20 + 1}–{Math.min(page * 20, data.meta.total)} di {data.meta.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={!data.meta.hasPrevPage}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  ← Prec
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!data.meta.hasNextPage}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  Succ →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
