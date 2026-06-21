'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { get, post, PaginatedResponse } from '@/lib/api';
import { getClientName } from '@/lib/utils';
import { CASE_STATUS_LABELS } from '@/lib/constants';
import { ArrowLeft, Save, Briefcase } from 'lucide-react';

interface Client {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

export default function NewCasePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    clientId: '',
    destination: '',
    departureDate: '',
    returnDate: '',
    numberOfPeople: '',
    travelType: '',
    totalAmount: '',
    internalNotes: '',
    status: 'INQUIRY',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: clients } = useQuery({
    queryKey: ['clients-select'],
    queryFn: () => get<PaginatedResponse<Client>>('/clients', { limit: 100, status: 'ACTIVE' }),
  });

  const create = useMutation({
    mutationFn: (data: object) => post<{ id: string }>('/cases', data),
    onSuccess: (data) => router.push(`/cases/${data.id}`),
    onError: () => setErrors({ _: 'Errore durante la creazione della pratica' }),
  });

  const set = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Campo obbligatorio';
    if (form.numberOfPeople && Number(form.numberOfPeople) < 1) e.numberOfPeople = 'Minimo 1';
    if (form.totalAmount && Number(form.totalAmount) < 0) e.totalAmount = 'Importo non valido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    create.mutate({
      title: form.title.trim(),
      status: form.status,
      clientId: form.clientId || undefined,
      destination: form.destination || undefined,
      departureDate: form.departureDate || undefined,
      returnDate: form.returnDate || undefined,
      numberOfPeople: form.numberOfPeople ? Number(form.numberOfPeople) : undefined,
      travelType: form.travelType || undefined,
      totalAmount: form.totalAmount ? Number(form.totalAmount) : undefined,
      internalNotes: form.internalNotes || undefined,
    });
  };

  const Field = ({ label, field, type = 'text', placeholder = '', required = false }: {
    label: string; field: string; type?: string; placeholder?: string; required?: boolean;
  }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[field as keyof typeof form]}
        onChange={e => set(field, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
    </div>
  );

  return (
    <>
      <Header title="Nuova Pratica" subtitle="Crea una nuova pratica viaggio" />
      <div className="p-6 max-w-3xl">
        <Link href="/cases" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={14} /> Torna alle pratiche
        </Link>

        {errors._ && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{errors._}</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Briefcase size={18} className="text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Dati pratica</h2>
              <p className="text-xs text-gray-400">Il numero pratica verrà generato automaticamente</p>
            </div>
          </div>

          <Field label="Titolo" field="title" required placeholder="Viaggio di Nozze Maldive — Ferrari" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
              <select
                value={form.clientId}
                onChange={e => set('clientId', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Nessun cliente —</option>
                {clients?.data.map(c => (
                  <option key={c.id} value={c.id}>{getClientName(c)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stato iniziale</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(CASE_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <Field label="Destinazione" field="destination" placeholder="Maldive" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Data partenza" field="departureDate" type="date" />
            <Field label="Data rientro" field="returnDate" type="date" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="N. passeggeri" field="numberOfPeople" type="number" placeholder="2" />
            <Field label="Tipo viaggio" field="travelType" placeholder="honeymoon, business..." />
            <Field label="Importo totale (€)" field="totalAmount" type="number" placeholder="11640" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Note interne</label>
            <textarea
              value={form.internalNotes}
              onChange={e => set('internalNotes', e.target.value)}
              rows={3}
              placeholder="Note riservate al team..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link href="/cases" className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800">Annulla</Link>
            <button
              type="submit"
              disabled={create.isPending}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
            >
              <Save size={16} />
              {create.isPending ? 'Creazione...' : 'Crea pratica'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
