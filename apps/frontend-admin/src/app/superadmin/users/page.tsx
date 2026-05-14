'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import { Search, Users, CheckCircle, XCircle, Lock, Unlock, KeyRound, Shield, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface SuperUser {
  id: string; email: string; firstName: string; lastName: string;
  status: string; isSuperAdmin: boolean; isEmailVerified: boolean;
  lastLoginAt?: string; createdAt: string; lockedUntil?: string;
  tenant: { id: string; name: string; slug: string };
}
interface PaginatedUsers {
  data: SuperUser[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-emerald-400', INACTIVE: 'text-yellow-400',
  SUSPENDED: 'text-red-400', PENDING_VERIFICATION: 'text-blue-400',
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Attivo', INACTIVE: 'Inattivo', SUSPENDED: 'Sospeso', PENDING_VERIFICATION: 'In verifica',
};

export default function SuperAdminUsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [resetTarget, setResetTarget] = useState<SuperUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmMsg, setConfirmMsg] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sa-users', { search, page }],
    queryFn: () => get<PaginatedUsers>('/superadmin/users', { search: search || undefined, page, limit: 30 }),
    placeholderData: (prev) => prev,
  });

  const block = useMutation({
    mutationFn: (id: string) => post(`/superadmin/users/${id}/block`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sa-users'] }); qc.invalidateQueries({ queryKey: ['sa-stats'] }); },
  });
  const unblock = useMutation({
    mutationFn: (id: string) => post(`/superadmin/users/${id}/unblock`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sa-users'] }); qc.invalidateQueries({ queryKey: ['sa-stats'] }); },
  });
  const resetPw = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      post(`/superadmin/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sa-users'] });
      setConfirmMsg('Password reimpostata con successo');
      setTimeout(() => { setResetTarget(null); setNewPassword(''); setConfirmMsg(''); }, 2000);
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Gestione Utenti</h1>
        <p className="text-sm mt-0.5" style={{ color: '#4d6a8c' }}>{data?.meta.total ?? 0} utenti su tutti i tenant</p>
      </div>

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-2xl border shadow-2xl" style={{ background: '#080f1e', borderColor: '#0d1f3c' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#7c3aed18' }}>
                <KeyRound size={18} style={{ color: '#7c3aed' }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Reset password</p>
                <p className="text-xs" style={{ color: '#4d6a8c' }}>{resetTarget.email}</p>
              </div>
            </div>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Nuova password (min. 8 caratteri)"
              className="input-dark w-full mb-3"
            />
            {confirmMsg && <p className="text-xs text-emerald-400 mb-3">{confirmMsg}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => newPassword.length >= 8 && resetPw.mutate({ id: resetTarget.id, newPassword })}
                disabled={newPassword.length < 8 || resetPw.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                {resetPw.isPending ? 'Salvando...' : 'Reimposta password'}
              </button>
              <button onClick={() => { setResetTarget(null); setNewPassword(''); }}
                className="px-4 py-2.5 rounded-xl text-sm" style={{ color: '#4d6a8c' }}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#4d6a8c' }} />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Cerca per email, nome..."
          className="input-dark w-full pl-9" />
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: '#080f1e', borderColor: '#0d1f3c' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: '#0d1f3c' }}>
              {['Utente', 'Tenant', 'Stato', 'Ultimo accesso', 'Creato', 'Azioni'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#2a3f5e' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-12" style={{ color: '#4d6a8c' }}>Caricamento...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12" style={{ color: '#4d6a8c' }}>Nessun utente trovato</td></tr>
            ) : data?.data.map(u => (
              <tr key={u.id} className="border-b transition-colors hover:bg-[#0d1f3c]" style={{ borderColor: '#0d1f3c' }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: u.isSuperAdmin ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : '#1e3050' }}>
                      {u.firstName?.charAt(0)}{u.lastName?.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-white">{u.firstName} {u.lastName}</p>
                        {u.isSuperAdmin && <Shield size={11} style={{ color: '#7c3aed' }} />}
                      </div>
                      <p className="text-xs" style={{ color: '#4d6a8c' }}>{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="text-xs text-white">{u.tenant.name}</p>
                    <p className="text-xs font-mono" style={{ color: '#4d6a8c' }}>{u.tenant.slug}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1 text-xs font-medium ${STATUS_COLORS[u.status] ?? 'text-gray-400'}`}>
                    {u.status === 'ACTIVE' ? <CheckCircle size={11} /> : u.status === 'SUSPENDED' ? <XCircle size={11} /> : <AlertTriangle size={11} />}
                    {STATUS_LABELS[u.status] ?? u.status}
                  </span>
                  {u.lockedUntil && new Date(u.lockedUntil) > new Date() && (
                    <p className="text-[10px] text-red-400 mt-0.5">Bloccato fino {formatDate(u.lockedUntil)}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: '#4d6a8c' }}>
                  {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Mai'}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: '#4d6a8c' }}>{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  {!u.isSuperAdmin && (
                    <div className="flex items-center gap-1.5">
                      {u.status === 'SUSPENDED' || (u.lockedUntil && new Date(u.lockedUntil) > new Date())
                        ? <button onClick={() => unblock.mutate(u.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-emerald-400 transition-all hover:bg-emerald-400/10">
                            <Unlock size={11} /> Sblocca
                          </button>
                        : <button onClick={() => block.mutate(u.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-red-400 transition-all hover:bg-red-400/10">
                            <Lock size={11} /> Blocca
                          </button>
                      }
                      <button onClick={() => setResetTarget(u)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all hover:bg-[#1e3050]" style={{ color: '#8ca4c8' }}>
                        <KeyRound size={11} /> Reset PW
                      </button>
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
          {Array.from({ length: Math.min(data.meta.totalPages, 10) }, (_, i) => i + 1).map(p => (
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
