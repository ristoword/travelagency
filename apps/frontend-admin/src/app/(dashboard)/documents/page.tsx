'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { get, PaginatedResponse } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Search, FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const DOC_TYPE_LABELS: Record<string, string> = {
  PASSPORT: 'Passaporto',
  IDENTITY_CARD: 'Carta d\'identità',
  DRIVING_LICENSE: 'Patente',
  VISA: 'Visto',
  HEALTH_CARD: 'Tessera sanitaria',
  TAX_CODE_CARD: 'Codice fiscale',
  RESIDENCE_PERMIT: 'Permesso di soggiorno',
  OTHER: 'Altro',
};
const STATUS_LABELS: Record<string, string> = {
  VALID: 'Valido', EXPIRED: 'Scaduto', EXPIRING_SOON: 'In scadenza', MISSING: 'Mancante',
};
const STATUS_COLORS: Record<string, string> = {
  VALID: 'badge-green', EXPIRED: 'badge-red', EXPIRING_SOON: 'badge-yellow', MISSING: 'badge-gray',
};
const STATUS_ICONS: Record<string, React.ElementType> = {
  VALID: CheckCircle, EXPIRED: AlertTriangle, EXPIRING_SOON: Clock, MISSING: AlertTriangle,
};

interface ClientDocument {
  id: string; type: string; status: string; documentNumber?: string;
  holderFirstName?: string; holderLastName?: string; nationality?: string;
  issuedAt?: string; expiryDate?: string;
  client?: { firstName?: string; lastName?: string; companyName?: string };
}

export default function DocumentsPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['client-documents', { search, type, status }],
    queryFn: () => get<PaginatedResponse<ClientDocument>>('/client-documents', {
      search: search || undefined, type: type || undefined,
      status: status || undefined, limit: 50,
    }),
    placeholderData: (prev) => prev,
  });

  const expiringSoon = data?.data.filter(d => d.status === 'EXPIRING_SOON').length ?? 0;
  const expired = data?.data.filter(d => d.status === 'EXPIRED').length ?? 0;
  const valid = data?.data.filter(d => d.status === 'VALID').length ?? 0;

  return (
    <>
      <Header title="Documenti Clienti" subtitle={`${data?.meta.total ?? 0} documenti`} />
      <div className="p-6 space-y-6">

        {/* Alert banner */}
        {(expiringSoon > 0 || expired > 0) && (
          <div className="card border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-300">
              {expired > 0 && <span className="font-semibold">{expired} documenti scaduti</span>}
              {expired > 0 && expiringSoon > 0 && ' · '}
              {expiringSoon > 0 && <span className="font-semibold">{expiringSoon} in scadenza</span>}
              {' '}— contatta i clienti per aggiornarli
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Totale', value: data?.meta.total ?? 0, color: '#3b82f6' },
            { label: 'Validi', value: valid, color: '#10b981' },
            { label: 'In scadenza', value: expiringSoon, color: '#f59e0b' },
            { label: 'Scaduti', value: expired, color: '#ef4444' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card-glow p-4">
              <div className="w-2 h-2 rounded-full mb-2" style={{ background: color }} />
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per numero, titolare..."
              className="input-dark w-full pl-9" />
          </div>
          <select value={type} onChange={e => setType(e.target.value)} className="input-dark">
            <option value="">Tutti i tipi</option>
            {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
                {['Tipo', 'Titolare', 'Cliente', 'Numero', 'Nazionalità', 'Scadenza', 'Stato'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-3)' }}>Caricamento...</td></tr>
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-3)' }}>Nessun documento trovato</td></tr>
              ) : data?.data.map(d => {
                const StatusIcon = STATUS_ICONS[d.status] ?? FileText;
                return (
                  <tr key={d.id} className="border-b hover:bg-[#1a2740] transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3 text-xs font-medium text-white">{DOC_TYPE_LABELS[d.type] ?? d.type}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                      {`${d.holderFirstName ?? ''} ${d.holderLastName ?? ''}`.trim() || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>
                      {d.client?.companyName ?? `${d.client?.firstName ?? ''} ${d.client?.lastName ?? ''}`.trim() || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-2)' }}>{d.documentNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{d.nationality ?? '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{d.expiryDate ? formatDate(d.expiryDate) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border w-fit ${STATUS_COLORS[d.status] ?? 'badge-gray'}`}>
                        <StatusIcon size={10} /> {STATUS_LABELS[d.status] ?? d.status}
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
