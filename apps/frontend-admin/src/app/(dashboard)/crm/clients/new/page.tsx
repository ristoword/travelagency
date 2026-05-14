'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { post } from '@/lib/api';
import { User, Building2, Mail, Phone, MapPin, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const CLIENT_TYPES = [
  { value: 'INDIVIDUAL', label: 'Privato', icon: User },
  { value: 'COMPANY', label: 'Azienda', icon: Building2 },
  { value: 'FAMILY', label: 'Famiglia', icon: User },
];
const SOURCES = [
  { value: 'WALK_IN', label: 'Walk-in' }, { value: 'REFERRAL', label: 'Referral' },
  { value: 'WEBSITE', label: 'Sito web' }, { value: 'SOCIAL_MEDIA', label: 'Social media' },
  { value: 'ADVERTISING', label: 'Pubblicità' }, { value: 'OTHER', label: 'Altro' },
];

export default function NewClientPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    type: 'INDIVIDUAL',
    firstName: '', lastName: '', companyName: '',
    email: '', phone: '', mobile: '',
    address: '', city: '', postalCode: '', country: 'IT',
    taxCode: '', vatNumber: '',
    source: 'WALK_IN',
    notes: '',
    isVip: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: (data: object) => post('/crm/clients', data),
    onSuccess: (data: { id: string }) => {
      router.push(`/crm/clients/${data.id}`);
    },
    onError: (err: { message?: string }) => {
      setErrors({ _: err.message ?? 'Errore durante la creazione del cliente' });
    },
  });

  const set = (field: string, value: string | boolean) =>
    setForm(p => ({ ...p, [field]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.type !== 'COMPANY' && !form.firstName.trim()) e.firstName = 'Campo obbligatorio';
    if (form.type !== 'COMPANY' && !form.lastName.trim()) e.lastName = 'Campo obbligatorio';
    if (form.type === 'COMPANY' && !form.companyName.trim()) e.companyName = 'Campo obbligatorio';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email non valida';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    create.mutate({
      ...form,
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      companyName: form.companyName || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      mobile: form.mobile || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      postalCode: form.postalCode || undefined,
      taxCode: form.taxCode || undefined,
      vatNumber: form.vatNumber || undefined,
      notes: form.notes || undefined,
    });
  };

  const Field = ({ label, field, type = 'text', placeholder = '', required = false }: {
    label: string; field: string; type?: string; placeholder?: string; required?: boolean;
  }) => (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={(form as Record<string, string>)[field] ?? ''}
        onChange={e => set(field, e.target.value)}
        placeholder={placeholder}
        className={`input-dark w-full ${errors[field] ? 'border-red-500/50' : ''}`}
      />
      {errors[field] && <p className="text-xs text-red-400 mt-1">{errors[field]}</p>}
    </div>
  );

  return (
    <>
      <Header
        title="Nuovo cliente"
        subtitle="CRM"
        action={{ label: 'Salva cliente', onClick: handleSubmit }}
      />
      <div className="p-6 max-w-3xl space-y-6">

        {/* Back */}
        <Link href="/crm/clients" className="flex items-center gap-1.5 text-xs hover:text-blue-400 transition-colors" style={{ color: 'var(--text-3)' }}>
          <ArrowLeft size={13} /> Torna alla lista clienti
        </Link>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type selector */}
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Tipo cliente</p>
            <div className="flex gap-3">
              {CLIENT_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('type', value)}
                  className={`flex-1 flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all ${form.type === value ? 'border-blue-500 bg-blue-500/10' : 'border-[#1e3050] hover:border-[#243856]'}`}>
                  <Icon size={15} style={{ color: form.type === value ? '#3b82f6' : 'var(--text-3)' }} />
                  <span className={`text-sm font-medium ${form.type === value ? 'text-blue-400' : ''}`} style={form.type !== value ? { color: 'var(--text-2)' } : {}}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Personal info */}
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-3)' }}>
              <User size={12} /> Dati anagrafici
            </p>
            <div className="grid grid-cols-2 gap-4">
              {form.type === 'COMPANY' ? (
                <div className="col-span-2">
                  <Field label="Ragione sociale" field="companyName" required placeholder="Rossi S.r.l." />
                </div>
              ) : (
                <>
                  <Field label="Nome" field="firstName" required placeholder="Mario" />
                  <Field label="Cognome" field="lastName" required placeholder="Rossi" />
                </>
              )}
              {form.type !== 'INDIVIDUAL' && (
                <>
                  <Field label="Nome referente" field="firstName" placeholder="Mario" />
                  <Field label="Cognome referente" field="lastName" placeholder="Rossi" />
                </>
              )}
              <Field label="Codice fiscale" field="taxCode" placeholder="RSSMRA80A01H501Z" />
              {form.type === 'COMPANY' && <Field label="Partita IVA" field="vatNumber" placeholder="IT12345678901" />}
              <div className="col-span-2 flex items-center gap-3">
                <input type="checkbox" id="vip" checked={form.isVip} onChange={e => set('isVip', e.target.checked)} className="w-4 h-4 rounded" />
                <label htmlFor="vip" className="text-sm text-white cursor-pointer">Cliente VIP</label>
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-3)' }}>
              <Mail size={12} /> Contatti
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email" field="email" type="email" placeholder="mario@example.com" />
              <Field label="Telefono" field="phone" placeholder="+39 06 1234567" />
              <Field label="Cellulare" field="mobile" placeholder="+39 333 1234567" />
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Fonte</label>
                <select value={form.source} onChange={e => set('source', e.target.value)} className="input-dark w-full">
                  {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-3)' }}>
              <MapPin size={12} /> Indirizzo
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Via / Piazza" field="address" placeholder="Via Roma 1" />
              </div>
              <Field label="Città" field="city" placeholder="Roma" />
              <Field label="CAP" field="postalCode" placeholder="00100" />
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Paese</label>
                <select value={form.country} onChange={e => set('country', e.target.value)} className="input-dark w-full">
                  <option value="IT">Italia</option>
                  <option value="FR">Francia</option>
                  <option value="DE">Germania</option>
                  <option value="ES">Spagna</option>
                  <option value="GB">UK</option>
                  <option value="US">USA</option>
                  <option value="CH">Svizzera</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Note</p>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Note aggiuntive sul cliente..."
              className="input-dark w-full resize-none"
            />
          </div>

          {errors._ && (
            <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10">
              <p className="text-xs text-red-400">{errors._}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={create.isPending}
              className="btn-primary flex items-center gap-2 disabled:opacity-50">
              <Save size={14} /> {create.isPending ? 'Salvataggio...' : 'Salva cliente'}
            </button>
            <Link href="/crm/clients" className="btn-ghost px-4 py-2 flex items-center gap-2">
              <ArrowLeft size={14} /> Annulla
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
