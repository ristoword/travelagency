'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch } from '@/lib/api';
import { Search, Building2, CheckCircle, XCircle, Clock, Plus, Shield, MoreVertical, ChevronDown } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Tenant {
  id: string; name: string; slug: string; email?: string; phone?: string;
  plan: string; isActive: boolean; isVerified: boolean;
  city?: string; vatNumber?: string; licenseKey?: string;
  suspendedAt?: string; suspendedReason?: string; trialEndsAt?: string;
  createdAt: string;
  _count?: { users: number };
}
interface PaginatedTenants {
  data: Tenant[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const PLAN_LABELS: Record<string, string> = { STARTER: 'Starter', PROFESSIONAL: 'Professional', ENTERPRISE: 'Enterprise' };
const PLAN_COLORS: Record<string, string> = { STARTER: 'badge-gray', PROFESSIONAL: 'badge-blue', ENTERPRISE: 'badge-purple' };

export default function TenantsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: '', slug: '', email: '', plan: 'STARTER' });
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sa-tenants', { search, page }],
    queryFn: () => get<PaginatedTenants>('/superadmin/tenants', { search: search || undefined, page, limit: 20 }),
    placeholderData: (prev) => prev,
  });

  const suspend = useMutation({
    mutationFn: (id: string) => post(`/superadmin/tenants/${id}/suspend`, { reason: 'Sospeso da superadmin' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sa-tenants'] }); qc.invalidateQueries({ queryKey: ['sa-stats'] }); setOpenMenu(null); },
  });
  const activate = useMutation({
    mutationFn: (id: string) => post(`/superadmin/tenants/${id}/activate`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sa-tenants'] }); qc.invalidateQueries({ queryKey: ['sa-stats'] }); setOpenMenu(null); },
  });
  const verify = useMutation({
    mutationFn: (id: string) => post(`/superadmin/tenants/${id}/verify`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sa-tenants'] }); setOpenMenu(null); },
  });
  const createTenant = useMutation({
    mutationFn: (dto: object) => post('/superadmin/tenants', dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sa-tenants'] }); qc.invalidateQueries({ queryKey: ['sa-stats'] }); setShowCreate(false); setNewTenant({ name: '', slug: '', email: '', plan: 'STARTER' }); },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Tenant & Licenze</h1>
          <p className="text-sm mt-0.5" style={{ color: '#4d6a8c' }}>{data?.meta.total ?? 0} tenant registrati</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          <Plus size={14} /> Nuovo tenant
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="p-5 rounded-2xl border" style={{ background: '#080f1e', borderColor: '#7c3aed50' }}>
          <p className="text-sm font-semibold text-white mb-4">Crea nuovo tenant</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#4d6a8c' }}>Nome agenzia *</label>
              <input value={newTenant.name} onChange={e => setNewTenant(p => ({ ...p, name: e.target.value }))}
                placeholder="Agenzia Viaggi Rossi" className="input-dark w-full" />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#4d6a8c' }}>Slug (URL) *</label>
              <input value={newTenant.slug} onChange={e => setNewTenant(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s/g, '-') }))}
                placeholder="agenzia-rossi" className="input-dark w-full font-mono text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#4d6a8c' }}>Email</label>
              <input value={newTenant.email} onChange={e => setNewTenant(p => ({ ...p, email: e.target.value }))}
                placeholder="info@agenzia.it" type="email" className="input-dark w-full" />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#4d6a8c' }}>Piano</label>
              <select value={newTenant.plan} onChange={e => setNewTenant(p => ({ ...p, plan: e.target.value }))} className="input-dark w-full">
                {Object.entries(PLAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => newTenant.name && newTenant.slug && createTenant.mutate(newTenant)}
              disabled={!newTenant.name || !newTenant.slug || createTenant.isPending}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              {createTenant.isPending ? 'Creazione...' : 'Crea tenant'}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-sm" style={{ color: '#4d6a8c' }}>Annulla</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#4d6a8c' }} />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Cerca per nome, slug, email..."
          className="input-dark w-full pl-9 max-w-md" />
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: '#080f1e', borderColor: '#0d1f3c' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: '#0d1f3c' }}>
              {['Agenzia', 'Slug', 'Piano', 'Stato', 'Verificato', 'Utenti', 'Creato', 'Azioni'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#2a3f5e' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-12" style={{ color: '#4d6a8c' }}>Caricamento...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12" style={{ color: '#4d6a8c' }}>Nessun tenant trovato</td></tr>
            ) : data?.data.map(t => (
              <tr key={t.id} className="border-b transition-colors hover:bg-[#0d1f3c]" style={{ borderColor: '#0d1f3c' }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: t.plan === 'ENTERPRISE' ? '#7c3aed' : t.plan === 'PROFESSIONAL' ? '#3b82f6' : '#1e3050' }}>
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-white">{t.name}</p>
                      {t.email && <p className="text-xs" style={{ color: '#4d6a8c' }}>{t.email}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#8ca4c8' }}>{t.slug}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${PLAN_COLORS[t.plan] ?? 'badge-gray'}`}>
                    {PLAN_LABELS[t.plan] ?? t.plan}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {t.isActive
                    ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={11} /> Attivo</span>
                    : <span className="flex items-center gap-1 text-xs text-red-400"><XCircle size={11} /> Sospeso</span>}
                </td>
                <td className="px-4 py-3">
                  {t.isVerified
                    ? <span className="flex items-center gap-1 text-xs text-emerald-400"><Shield size={11} /> Verificato</span>
                    : <span className="flex items-center gap-1 text-xs" style={{ color: '#4d6a8c' }}><Clock size={11} /> In attesa</span>}
                </td>
                <td className="px-4 py-3 text-white font-semibold">{t._count?.users ?? '—'}</td>
                <td className="px-4 py-3 text-xs" style={{ color: '#4d6a8c' }}>{formatDate(t.createdAt)}</td>
                <td className="px-4 py-3 relative">
                  <button onClick={() => setOpenMenu(openMenu === t.id ? null : t.id)}
                    className="p-1.5 rounded-lg transition-all hover:bg-[#1e3050]" style={{ color: '#4d6a8c' }}>
                    <MoreVertical size={14} />
                  </button>
                  {openMenu === t.id && (
                    <div className="absolute right-4 top-10 z-50 rounded-xl border shadow-2xl overflow-hidden w-44"
                      style={{ background: '#080f1e', borderColor: '#0d1f3c' }}>
                      {!t.isVerified && (
                        <button onClick={() => verify.mutate(t.id)}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-left transition-all hover:bg-[#0d1f3c] text-emerald-400">
                          <Shield size={12} /> Verifica tenant
                        </button>
                      )}
                      {t.isActive
                        ? <button onClick={() => suspend.mutate(t.id)}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-left transition-all hover:bg-[#0d1f3c] text-red-400">
                            <XCircle size={12} /> Sospendi
                          </button>
                        : <button onClick={() => activate.mutate(t.id)}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-left transition-all hover:bg-[#0d1f3c] text-emerald-400">
                            <CheckCircle size={12} /> Riattiva
                          </button>
                      }
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: data.meta.totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${page === p ? 'text-white' : 'hover:bg-[#0d1f3c]'}`}
              style={page === p ? { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' } : { color: '#4d6a8c' }}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
