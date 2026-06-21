'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { get } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CASE_STATUS_LABELS, CASE_STATUS_COLORS } from '@/lib/constants';
import {
  ArrowLeft, Plane, Users, MapPin, Calendar, Euro,
  CheckSquare, FileText, Briefcase, Star, Clock, Phone, Mail,
} from 'lucide-react';
import Link from 'next/link';

interface CaseDetail {
  id: string; number: string; title: string; status: string;
  destination?: string; departureDate?: string; returnDate?: string;
  numberOfPeople?: number; travelType?: string;
  totalAmount: number; totalCost: number; totalPaid: number; balance: number;
  currency: string; internalNotes?: string;
  client?: { id: string; firstName?: string; lastName?: string; companyName?: string; email?: string; phone?: string };
  assignedTo?: { firstName: string; lastName: string; email: string };
  passengers?: Array<{ id: string; firstName: string; lastName: string; isLeader: boolean; passportNumber?: string; passportExpiry?: string; birthDate?: string }>;
  services?: Array<{ id: string; type: string; description: string; provider?: string; status: string; serviceDate?: string; amount: number; cost: number; numberOfPax?: number; providerRef?: string }>;
  itinerary?: Array<{ id: string; dayNumber: number; date: string; title: string; description?: string; location?: string; accommodation?: string }>;
  checklists?: Array<{ id: string; item: string; isCompleted: boolean; dueDate?: string }>;
  notes?: Array<{ id: string; content: string; type: string; isPrivate: boolean; createdAt: string; author?: { firstName: string; lastName: string } }>;
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  FLIGHT: '✈️ Volo', HOTEL: '🏨 Hotel', TRANSFER: '🚌 Transfer',
  EXCURSION: '🗺️ Escursione', INSURANCE: '🛡️ Assicurazione',
  PACKAGE: '📦 Pacchetto', CAR_RENTAL: '🚗 Auto', CRUISE: '🚢 Crociera', OTHER: '📌 Altro',
};
const SVC_STATUS_COLORS: Record<string, string> = {
  PENDING: 'badge-gray', CONFIRMED: 'badge-green', CANCELLED: 'badge-red', ON_REQUEST: 'badge-yellow',
};

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: c, isLoading, isError } = useQuery({
    queryKey: ['case', id],
    queryFn: () => get<CaseDetail>(`/cases/${id}`),
    enabled: !!id,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-3)' }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p>Caricamento pratica...</p>
      </div>
    </div>
  );

  if (isError || !c) return (
    <div className="flex items-center justify-center h-full flex-col gap-3">
      <p className="text-red-400">Pratica non trovata</p>
      <button onClick={() => router.push('/cases')} className="btn-ghost flex items-center gap-2">
        <ArrowLeft size={14} /> Torna alle pratiche
      </button>
    </div>
  );

  const marginPct = c.totalAmount > 0 ? ((c.totalAmount - c.totalCost) / c.totalAmount * 100).toFixed(1) : '0';

  return (
    <>
      <Header
        title={c.number}
        subtitle={c.title}
        action={{ label: 'Pratiche', href: '/cases' }}
      />
      <div className="p-6 space-y-6">

        {/* Back + status */}
        <div className="flex items-center gap-3">
          <Link href="/cases" className="flex items-center gap-1.5 text-sm transition-colors hover:text-white" style={{ color: 'var(--text-2)' }}>
            <ArrowLeft size={14} /> Tutte le pratiche
          </Link>
          <span className="text-[#1e3050]">/</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${CASE_STATUS_COLORS[c.status] ?? 'badge-gray'}`}>
            {CASE_STATUS_LABELS[c.status] ?? c.status}
          </span>
        </div>

        {/* Top info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card-glow p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f59e0b18' }}>
                <Briefcase size={20} style={{ color: '#f59e0b' }} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">{c.title}</h2>
                <div className="flex flex-wrap gap-4 mt-2 text-sm" style={{ color: 'var(--text-2)' }}>
                  {c.destination && <span className="flex items-center gap-1"><MapPin size={13} /> {c.destination}</span>}
                  {c.departureDate && <span className="flex items-center gap-1"><Calendar size={13} /> {formatDate(c.departureDate)} → {c.returnDate ? formatDate(c.returnDate) : '?'}</span>}
                  {c.numberOfPeople && <span className="flex items-center gap-1"><Users size={13} /> {c.numberOfPeople} pax</span>}
                </div>
                {c.internalNotes && (
                  <p className="mt-3 text-xs p-3 rounded-lg italic" style={{ background: 'var(--bg-secondary)', color: 'var(--text-2)' }}>
                    📝 {c.internalNotes}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Financial summary */}
          <div className="card-glow p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Riepilogo finanziario</p>
            {[
              { label: 'Totale cliente', value: c.totalAmount, color: 'text-white' },
              { label: 'Costo fornitore', value: c.totalCost, color: 'text-red-400' },
              { label: 'Margine', value: c.totalAmount - c.totalCost, color: 'text-emerald-400', extra: `${marginPct}%` },
              { label: 'Pagato', value: c.totalPaid, color: 'text-blue-400' },
              { label: 'Saldo', value: c.balance, color: c.balance > 0 ? 'text-amber-400' : 'text-emerald-400' },
            ].map(({ label, value, color, extra }) => (
              <div key={label} className="flex justify-between items-center text-sm">
                <span style={{ color: 'var(--text-2)' }}>{label}</span>
                <span className={`font-semibold ${color}`}>
                  {formatCurrency(Number(value))} {extra ? <span className="text-xs ml-1 opacity-70">{extra}</span> : null}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Client */}
          {c.client && (
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Cliente</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                  {(c.client.firstName ?? c.client.companyName ?? '?').charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {c.client.companyName ?? `${c.client.firstName ?? ''} ${c.client.lastName ?? ''}`}
                  </p>
                  <div className="flex gap-3 mt-0.5">
                    {c.client.email && <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-3)' }}><Mail size={10} /> {c.client.email}</span>}
                    {c.client.phone && <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-3)' }}><Phone size={10} /> {c.client.phone}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Passengers */}
          {c.passengers && c.passengers.length > 0 && (
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>
                <Users size={11} className="inline mr-1" /> Passeggeri ({c.passengers.length})
              </p>
              <div className="space-y-2">
                {c.passengers.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      {p.isLeader && <Star size={11} className="text-amber-400 flex-shrink-0" />}
                      <p className="text-sm font-medium text-white">{p.firstName} {p.lastName}</p>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                      {p.passportNumber && <span className="font-mono mr-2">{p.passportNumber}</span>}
                      {p.passportExpiry && <span>Scade: {formatDate(p.passportExpiry)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Services */}
        {c.services && c.services.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
              <Plane size={14} style={{ color: '#3b82f6' }} />
              <p className="text-sm font-semibold text-white">Servizi prenotati ({c.services.length})</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  {['Tipo', 'Descrizione', 'Fornitore', 'Codice', 'Data', 'Pax', 'Importo', 'Costo', 'Stato'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.services.map(s => (
                  <tr key={s.id} className="border-b hover:bg-[#1a2740] transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{SERVICE_TYPE_LABELS[s.type] ?? s.type}</td>
                    <td className="px-4 py-3 font-medium text-white max-w-[180px]"><p className="truncate">{s.description}</p></td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{s.provider ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-2)' }}>{s.providerRef ?? '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-2)' }}>{s.serviceDate ? formatDate(s.serviceDate) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-center" style={{ color: 'var(--text-2)' }}>{s.numberOfPax ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-white text-right">{formatCurrency(Number(s.amount))}</td>
                    <td className="px-4 py-3 text-xs text-right text-red-400">{formatCurrency(Number(s.cost))}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${SVC_STATUS_COLORS[s.status] ?? 'badge-gray'}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Itinerary */}
        {c.itinerary && c.itinerary.length > 0 && (
          <div className="card p-5">
            <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin size={14} style={{ color: '#10b981' }} /> Itinerario ({c.itinerary.length} giorni)
            </p>
            <div className="space-y-3">
              {c.itinerary.map(day => (
                <div key={day.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                      {day.dayNumber}
                    </div>
                    <div className="w-px flex-1 mt-1" style={{ background: 'var(--border)' }} />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white text-sm">{day.title}</p>
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>{formatDate(day.date)}</span>
                    </div>
                    {day.location && <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-2)' }}><MapPin size={10} /> {day.location}</p>}
                    {day.description && <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{day.description}</p>}
                    {day.accommodation && <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-3)' }}>🏨 {day.accommodation}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Checklist */}
          {c.checklists && c.checklists.length > 0 && (
            <div className="card p-5">
              <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <CheckSquare size={14} style={{ color: '#f59e0b' }} />
                Checklist ({c.checklists.filter(x => x.isCompleted).length}/{c.checklists.length})
              </p>
              <div className="w-full h-1.5 rounded-full mb-4" style={{ background: 'var(--bg-secondary)' }}>
                <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${(c.checklists.filter(x => x.isCompleted).length / c.checklists.length) * 100}%` }} />
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {c.checklists.map(item => (
                  <div key={item.id} className="flex items-center gap-2.5 text-sm">
                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${item.isCompleted ? 'bg-emerald-500' : 'border border-[#243856]'}`}>
                      {item.isCompleted && <span className="text-white text-[9px]">✓</span>}
                    </div>
                    <span className={item.isCompleted ? 'line-through' : 'text-white'} style={item.isCompleted ? { color: 'var(--text-3)' } : {}}>
                      {item.item}
                    </span>
                    {item.dueDate && <span className="ml-auto text-[10px] flex-shrink-0" style={{ color: 'var(--text-3)' }}><Clock size={9} className="inline mr-0.5" />{formatDate(item.dueDate)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {c.notes && c.notes.length > 0 && (
            <div className="card p-5">
              <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <FileText size={14} style={{ color: '#8b5cf6' }} /> Note ({c.notes.length})
              </p>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {c.notes.map(n => (
                  <div key={n.id} className="p-3 rounded-xl text-sm" style={{ background: 'var(--bg-secondary)' }}>
                    <p style={{ color: 'var(--text-2)' }}>{n.content}</p>
                    <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-3)' }}>
                      {n.author ? `${n.author.firstName} ${n.author.lastName} · ` : ''}{formatDate(n.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
