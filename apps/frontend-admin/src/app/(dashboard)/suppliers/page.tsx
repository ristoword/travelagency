'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { get, PaginatedResponse } from '@/lib/api';
import { Search, Star, Building2, Plane, Hotel, Shield } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  AIRLINE: 'Vettore aereo', HOTEL: 'Hotel', HOTEL_CHAIN: 'Catena alberghiera',
  TOUR_OPERATOR: 'Tour operator', TRANSFER_COMPANY: 'Transfer', CRUISE_LINE: 'Crociere',
  CAR_RENTAL: 'Autonoleggio', INSURANCE_COMPANY: 'Assicurazione', DMC: 'DMC',
  VISA_AGENCY: 'Agenzia visti', GROUND_HANDLER: 'Ground handler', OTHER: 'Altro',
};
const TYPE_ICONS: Record<string, React.ElementType> = {
  AIRLINE: Plane, HOTEL: Hotel, HOTEL_CHAIN: Hotel,
  INSURANCE_COMPANY: Shield,
};

interface Supplier {
  id: string; name: string; type: string; code?: string; country?: string;
  email?: string; phone?: string; status: string; isPreferred: boolean;
  overallScore?: number; defaultCommissionRate?: number;
  contactPerson?: string;
}

export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [isPreferred, setIsPreferred] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', { search, type, isPreferred }],
    queryFn: () => get<PaginatedResponse<Supplier>>('/suppliers', {
      search: search || undefined, type: type || undefined,
      isPreferred: isPreferred === 'true' ? true : isPreferred === 'false' ? false : undefined,
      limit: 50,
    }),
    placeholderData: (prev) => prev,
  });

  const preferredCount = data?.data.filter(s => s.isPreferred).length ?? 0;
  const activeCount = data?.data.filter(s => s.status === 'ACTIVE').length ?? 0;

  return (
    <>
      <Header title="Fornitori" subtitle={`${data?.meta.total ?? 0} fornitori`} />
      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Totale', value: data?.meta.total ?? 0, color: '#3b82f6' },
            { label: 'Attivi', value: activeCount, color: '#10b981' },
            { label: 'Preferiti', value: preferredCount, color: '#f59e0b' },
            { label: 'Tipologie', value: Object.keys(TYPE_LABELS).length, color: '#8b5cf6' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card-glow p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>{label}</p>
              </div>
              <p className="text-2xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca fornitore..."
              className="input-dark w-full pl-9" />
          </div>
          <select value={type} onChange={e => setType(e.target.value)} className="input-dark">
            <option value="">Tutte le tipologie</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={isPreferred} onChange={e => setIsPreferred(e.target.value)} className="input-dark">
            <option value="">Tutti</option>
            <option value="true">Solo preferiti</option>
            <option value="false">Non preferiti</option>
          </select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="text-center py-20" style={{ color: 'var(--text-3)' }}>Caricamento...</div>
        ) : data?.data.length === 0 ? (
          <div className="text-center py-20" style={{ color: 'var(--text-3)' }}>Nessun fornitore trovato</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data?.data.map(s => {
              const Icon = TYPE_ICONS[s.type] ?? Building2;
              return (
                <div key={s.id} className="card-glow p-5 hover:border-[#243856] transition-all">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#3b82f618' }}>
                      <Icon size={16} style={{ color: '#3b82f6' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white truncate">{s.name}</p>
                        {s.isPreferred && (
                          <span className="flex items-center gap-0.5 text-[10px] badge-yellow px-1.5 py-0.5 rounded-full border">
                            <Star size={9} className="fill-current" /> Preferito
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{TYPE_LABELS[s.type] ?? s.type} {s.code ? `· ${s.code}` : ''}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-2)' }}>
                    {s.email && <p>{s.email}</p>}
                    {s.contactPerson && <p>Referente: {s.contactPerson}</p>}
                    {s.country && <p>Paese: {s.country}</p>}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    {s.overallScore ? (
                      <span className="flex items-center gap-1 text-xs text-amber-400">
                        <Star size={11} className="fill-current" /> {Number(s.overallScore).toFixed(1)}
                      </span>
                    ) : <span />}
                    {s.defaultCommissionRate != null && (
                      <span className="text-xs badge-green px-2 py-0.5 rounded-full border">
                        Comm. {s.defaultCommissionRate}%
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${s.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>
                      {s.status === 'ACTIVE' ? 'Attivo' : 'Inattivo'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
