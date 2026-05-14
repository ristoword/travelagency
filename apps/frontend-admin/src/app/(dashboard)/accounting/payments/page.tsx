'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { get, PaginatedResponse } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, ArrowDownLeft, ArrowUpRight, TrendingUp, CreditCard } from 'lucide-react';

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Contanti', BANK_TRANSFER: 'Bonifico', CREDIT_CARD: 'Carta credito',
  DEBIT_CARD: 'Carta debito', CHECK: 'Assegno', PAYPAL: 'PayPal',
  STRIPE: 'Stripe', CRYPTO: 'Crypto', OTHER: 'Altro',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'In attesa', COMPLETED: 'Completato', FAILED: 'Fallito', REFUNDED: 'Rimborsato', CANCELLED: 'Annullato',
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'badge-yellow', COMPLETED: 'badge-green', FAILED: 'badge-red', REFUNDED: 'badge-purple', CANCELLED: 'badge-gray',
};

interface Payment {
  id: string; direction: string; method: string; status: string;
  amount: number; currency: string; reference?: string; paidAt?: string;
  client?: { firstName?: string; lastName?: string; companyName?: string };
  invoice?: { number: string };
}
interface CashFlow {
  summary: { incoming: number; outgoing: number; net: number };
  byMethod: Array<{ method: string; _count: number; _sum: { amount: number } }>;
}

export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState('');
  const [status, setStatus] = useState('');

  const { data: cashflow } = useQuery({
    queryKey: ['cashflow'],
    queryFn: () => get<CashFlow>('/payments/cash-flow'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['payments', { search, direction, status }],
    queryFn: () => get<PaginatedResponse<Payment>>('/payments', {
      search: search || undefined, direction: direction || undefined,
      status: status || undefined, limit: 50,
    }),
    placeholderData: (prev) => prev,
  });

  return (
    <>
      <Header title="Pagamenti" subtitle={`${data?.meta.total ?? 0} pagamenti`} />
      <div className="p-6 space-y-6">

        {/* Cash flow stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-glow p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#10b98118' }}>
                <ArrowDownLeft size={15} style={{ color: '#10b981' }} />
              </div>
              <p className="text-xs" style={{ color: 'var(--text-2)' }}>Entrate</p>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(cashflow?.summary.incoming ?? 0)}</p>
          </div>
          <div className="card-glow p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#ef444418' }}>
                <ArrowUpRight size={15} style={{ color: '#ef4444' }} />
              </div>
              <p className="text-xs" style={{ color: 'var(--text-2)' }}>Uscite</p>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(cashflow?.summary.outgoing ?? 0)}</p>
          </div>
          <div className="card-glow p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#6366f118' }}>
                <TrendingUp size={15} style={{ color: '#6366f1' }} />
              </div>
              <p className="text-xs" style={{ color: 'var(--text-2)' }}>Flusso netto</p>
            </div>
            <p className={`text-2xl font-bold ${(cashflow?.summary.net ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(cashflow?.summary.net ?? 0)}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per riferimento..."
              className="input-dark w-full pl-9" />
          </div>
          <select value={direction} onChange={e => setDirection(e.target.value)} className="input-dark">
            <option value="">Tutti</option>
            <option value="INCOMING">Entrate</option>
            <option value="OUTGOING">Uscite</option>
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} className="input-dark">
            <option value="">Tutti gli stati</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                {['Tipo', 'Cliente', 'Fattura', 'Metodo', 'Importo', 'Stato', 'Data'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-3)' }}>Caricamento...</td></tr>
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-3)' }}>Nessun pagamento trovato</td></tr>
              ) : data?.data.map(p => (
                <tr key={p.id} className="border-b hover:bg-[#1a2740] transition-colors" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs font-semibold ${p.direction === 'INCOMING' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {p.direction === 'INCOMING' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                      {p.direction === 'INCOMING' ? 'Entrata' : 'Uscita'}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                    {p.client?.companyName ?? `${p.client?.firstName ?? ''} ${p.client?.lastName ?? ''}`.trim() || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{p.invoice?.number ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-2)' }}>
                      <CreditCard size={11} /> {METHOD_LABELS[p.method] ?? p.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-white">{formatCurrency(Number(p.amount))}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[p.status] ?? 'badge-gray'}`}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{p.paidAt ? formatDate(p.paidAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
