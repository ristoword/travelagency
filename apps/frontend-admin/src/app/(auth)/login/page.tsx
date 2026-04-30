'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, Plane, Globe, TrendingUp, Users, FileText, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'Minimo 6 caratteri'),
  tenantSlug: z.string().min(1, 'Inserisci il codice agenzia'),
});
type FormData = z.infer<typeof schema>;

const features = [
  { icon: Users, label: 'CRM Clienti', desc: 'Gestisci lead, clienti e pratiche' },
  { icon: FileText, label: 'Preventivi', desc: 'Calcolo automatico margini' },
  { icon: Plane, label: 'Prenotazioni', desc: 'Voli, hotel, transfer e molto altro' },
  { icon: TrendingUp, label: 'Analytics', desc: 'KPI, dashboard e previsioni' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [show, setShow] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tenantSlug: 'demo-agenzia' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password, data.tenantSlug);
      toast.success('Benvenuto!');
      router.push('/dashboard');
    } catch {
      toast.error('Credenziali non valide — riprova');
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[55%] flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1f42 50%, #0a1628 100%)' }}>

        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(99,102,241,0.6) 1px, transparent 0)', backgroundSize: '40px 40px' }} />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-8 blur-3xl"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center glow-blue"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
              <Globe size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">TravelAgency</p>
              <p className="text-xs" style={{ color: 'var(--text-2)' }}>Management System</p>
            </div>
          </div>

          {/* Hero */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium w-fit"
              style={{ borderColor: 'rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#818cf8' }}>
              <Star size={10} className="fill-current" />
              Il gestionale per agenzie di viaggio
            </div>

            <h1 className="text-5xl font-bold text-white leading-tight mb-4">
              Gestisci la tua<br />
              <span className="text-gradient">agenzia viaggi</span><br />
              in un unico posto
            </h1>

            <p className="text-lg mb-10 leading-relaxed" style={{ color: 'var(--text-2)' }}>
              CRM, preventivi, prenotazioni, contabilità e analytics
              tutto integrato. Per agenzie moderne.
            </p>

            {/* Feature list */}
            <div className="grid grid-cols-2 gap-3">
              {features.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3 p-3 rounded-xl border"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(59,130,246,0.15)' }}>
                    <Icon size={14} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium leading-none mb-0.5">{label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom stats */}
          <div className="flex gap-8 pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
            {[['10+', 'Moduli'], ['200+', 'Endpoint API'], ['40+', 'Modelli DB']].map(([n, l]) => (
              <div key={l}>
                <p className="text-2xl font-bold text-white">{n}</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
              <Globe size={18} className="text-white" />
            </div>
            <p className="text-white font-bold">TravelAgency</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Benvenuto</h2>
            <p style={{ color: 'var(--text-2)' }} className="text-sm">Accedi al pannello di gestione</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Tenant */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                Codice Agenzia
              </label>
              <input
                {...register('tenantSlug')}
                placeholder="es: demo-agenzia"
                className="input-dark w-full"
              />
              {errors.tenantSlug && <p className="text-red-400 text-xs mt-1">{errors.tenantSlug.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="admin@demo-agenzia.it"
                className="input-dark w-full"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Password</label>
                <button type="button" className="text-xs text-blue-400 hover:text-blue-300">
                  Password dimenticata?
                </button>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input-dark w-full pr-10"
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-3)' }}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button type="submit" disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center gap-2 mt-6 py-3 glow-blue disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading && <Loader2 size={15} className="animate-spin" />}
              {isLoading ? 'Accesso in corso...' : 'Accedi al pannello'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 rounded-xl border" style={{ background: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.15)' }}>
            <p className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-1.5">
              <Star size={10} className="fill-current" /> Credenziali demo
            </p>
            <div className="space-y-1">
              <p className="text-xs font-mono" style={{ color: 'var(--text-2)' }}>admin@demo-agenzia.it</p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-2)' }}>Admin123!</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Codice: demo-agenzia</p>
            </div>
          </div>

          <p className="text-center text-xs mt-8" style={{ color: 'var(--text-3)' }}>
            Travel Agency Management System &copy; 2025
          </p>
        </div>
      </div>
    </div>
  );
}
