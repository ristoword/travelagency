'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'Minimo 6 caratteri'),
  tenantSlug: z.string().min(1, 'Inserisci il codice agenzia'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tenantSlug: process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? 'demo-agenzia',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password, data.tenantSlug);
      toast.success('Accesso effettuato');
      router.push('/dashboard');
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(msg ?? 'Credenziali non valide');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <MapPin size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Travel Agency</h1>
          <p className="text-slate-400 text-sm mt-1">Sistema Gestionale</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Accedi al pannello</h2>
          <p className="text-gray-500 text-sm mb-6">Inserisci le tue credenziali per continuare</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Codice Agenzia</label>
              <input
                {...register('tenantSlug')}
                type="text"
                placeholder="es: demo-agenzia"
                className={cn('w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                  errors.tenantSlug ? 'border-red-400' : 'border-gray-300')}
              />
              {errors.tenantSlug && <p className="text-red-500 text-xs mt-1">{errors.tenantSlug.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="admin@demo-agenzia.it"
                className={cn('w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                  errors.email ? 'border-red-400' : 'border-gray-300')}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={cn('w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10',
                    errors.password ? 'border-red-400' : 'border-gray-300')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              {isLoading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800 font-medium mb-1">Credenziali demo</p>
            <p className="text-xs text-blue-700">admin@demo-agenzia.it / Admin123!</p>
            <p className="text-xs text-blue-700">Codice agenzia: demo-agenzia</p>
          </div>
        </div>
      </div>
    </div>
  );
}
