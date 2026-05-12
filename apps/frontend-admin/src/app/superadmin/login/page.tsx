'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState('basilepaolo@me.com');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password, '_superadmin');
      const user = useAuthStore.getState().user;
      if (!user?.isSuperAdmin) {
        useAuthStore.getState().logout();
        setError('Accesso non autorizzato: account non superadmin');
        return;
      }
      router.push('/superadmin');
    } catch {
      setError('Credenziali non valide');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#050d1a' }}>
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SuperAdmin Panel</h1>
          <p className="text-sm mt-1" style={{ color: '#4d6a8c' }}>Accesso riservato agli amministratori di sistema</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 space-y-5">
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-2)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="input-dark w-full"
              placeholder="email@example.com"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-2)' }}>Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="input-dark w-full pr-10"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <button type="submit" disabled={isLoading}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            {isLoading ? 'Accesso...' : 'Accedi al pannello'}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: '#2a3f5e' }}>
          Tenant: <span className="font-mono">_superadmin</span>
        </p>
      </div>
    </div>
  );
}
