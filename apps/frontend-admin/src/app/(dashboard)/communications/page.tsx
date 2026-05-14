'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { get, PaginatedResponse } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Search, Mail, MessageCircle, CheckCircle, XCircle, Clock, Send } from 'lucide-react';

const CHANNEL_LABELS: Record<string, string> = { EMAIL: 'Email', WHATSAPP: 'WhatsApp', SMS: 'SMS' };
const CHANNEL_COLORS: Record<string, string> = { EMAIL: 'badge-blue', WHATSAPP: 'badge-green', SMS: 'badge-yellow' };
const STATUS_LABELS: Record<string, string> = {
  QUEUED: 'In coda', SENT: 'Inviato', DELIVERED: 'Consegnato', READ: 'Letto',
  FAILED: 'Fallito', BOUNCED: 'Rimbalzato', CANCELLED: 'Annullato',
};
const STATUS_COLORS: Record<string, string> = {
  QUEUED: 'badge-gray', SENT: 'badge-blue', DELIVERED: 'badge-green',
  READ: 'badge-purple', FAILED: 'badge-red', BOUNCED: 'badge-red', CANCELLED: 'badge-gray',
};

interface Communication {
  id: string; channel: string; status: string; subject?: string;
  body: string; toAddress: string; sentAt?: string; createdAt: string;
  client?: { firstName?: string; lastName?: string; companyName?: string };
  author?: { firstName: string; lastName: string };
}
interface CommStats {
  byChannel: Array<{ channel: string; _count: number }>;
  byStatus: Array<{ status: string; _count: number }>;
  total: number;
}

export default function CommunicationsPage() {
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['comm-stats'],
    queryFn: () => get<CommStats>('/communications/stats'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['communications', { search, channel, status }],
    queryFn: () => get<PaginatedResponse<Communication>>('/communications', {
      search: search || undefined, channel: channel || undefined,
      status: status || undefined, limit: 50,
    }),
    placeholderData: (prev) => prev,
  });

  const sent = stats?.byStatus.find(s => s.status === 'SENT')?._count ?? 0;
  const failed = stats?.byStatus.find(s => s.status === 'FAILED')?._count ?? 0;
  const total = stats?.total ?? 0;

  return (
    <>
      <Header title="Comunicazioni" subtitle={`${data?.meta.total ?? 0} messaggi`} />
      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Totale', value: total, icon: Send, color: '#3b82f6' },
            { label: 'Inviati', value: sent, icon: CheckCircle, color: '#10b981' },
            { label: 'Falliti', value: failed, icon: XCircle, color: '#ef4444' },
            { label: 'In coda', value: stats?.byStatus.find(s => s.status === 'QUEUED')?._count ?? 0, icon: Clock, color: '#f59e0b' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card-glow p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                  <Icon size={15} style={{ color }} />
                </div>
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>{label}</p>
              </div>
              <p className="text-2xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Channel breakdown */}
        {stats?.byChannel && stats.byChannel.length > 0 && (
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Per canale</p>
            <div className="flex gap-4 flex-wrap">
              {stats.byChannel.map(c => {
                const Icon = c.channel === 'WHATSAPP' ? MessageCircle : Mail;
                return (
                  <button key={c.channel} onClick={() => setChannel(channel === c.channel ? '' : c.channel)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${channel === c.channel ? 'border-blue-500 bg-blue-500/10' : 'border-[#1e3050] hover:border-[#243856]'}`}>
                    <Icon size={14} style={{ color: '#3b82f6' }} />
                    <span className="text-sm font-medium text-white">{CHANNEL_LABELS[c.channel] ?? c.channel}</span>
                    <span className="text-xs badge-blue px-1.5 py-0.5 rounded-full border">{c._count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per oggetto, destinatario..."
              className="input-dark w-full pl-9" />
          </div>
          <select value={channel} onChange={e => setChannel(e.target.value)} className="input-dark">
            <option value="">Tutti i canali</option>
            {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
                {['Canale', 'A', 'Oggetto', 'Cliente', 'Inviato da', 'Data', 'Stato'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-3)' }}>Caricamento...</td></tr>
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-3)' }}>Nessuna comunicazione trovata</td></tr>
              ) : data?.data.map(c => (
                <tr key={c.id} className="border-b hover:bg-[#1a2740] transition-colors" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${CHANNEL_COLORS[c.channel] ?? 'badge-gray'}`}>
                      {CHANNEL_LABELS[c.channel] ?? c.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-2)' }}>{c.toAddress}</td>
                  <td className="px-4 py-3 font-medium text-white max-w-[200px] truncate">{c.subject ?? c.body.slice(0, 50)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>
                    {c.client?.companyName ?? `${c.client?.firstName ?? ''} ${c.client?.lastName ?? ''}`.trim() || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>
                    {c.author ? `${c.author.firstName} ${c.author.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{formatDate(c.sentAt ?? c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[c.status] ?? 'badge-gray'}`}>
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
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
