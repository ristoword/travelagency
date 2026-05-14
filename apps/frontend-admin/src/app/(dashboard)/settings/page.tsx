'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { get, patch } from '@/lib/api';
import { Settings, Euro, Globe, FileText, Calendar, Percent, CheckCircle, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface SettingItem {
  key: string; value: string | number; updatedAt?: string;
}

const SETTING_META: Record<string, { label: string; description: string; icon: React.ElementType; type: 'text' | 'number' | 'select'; options?: string[] }> = {
  default_currency:         { label: 'Valuta predefinita', description: 'Valuta usata per preventivi e fatture', icon: Euro, type: 'select', options: ['EUR', 'USD', 'GBP', 'CHF'] },
  default_language:         { label: 'Lingua predefinita', description: 'Lingua dell\'interfaccia e documenti', icon: Globe, type: 'select', options: ['it', 'en', 'fr', 'de'] },
  vat_rate:                 { label: 'Aliquota IVA (%)', description: 'Percentuale IVA applicata alle fatture', icon: Percent, type: 'number' },
  invoice_prefix:           { label: 'Prefisso fattura', description: 'Prefisso per numerazione fatture (es. FT, INV)', icon: FileText, type: 'text' },
  quotation_validity_days:  { label: 'Validità preventivi (giorni)', description: 'Giorni di validità default per i preventivi', icon: Calendar, type: 'number' },
  fiscal_year_start:        { label: 'Inizio anno fiscale', description: 'Data inizio anno fiscale (MM-DD)', icon: Calendar, type: 'text' },
  booking_commission_default: { label: 'Commissione prenotazioni (%)', description: 'Commissione percentuale predefinita su prenotazioni', icon: Percent, type: 'number' },
  timezone:                 { label: 'Fuso orario', description: 'Fuso orario tenant', icon: Globe, type: 'select', options: ['Europe/Rome', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo'] },
};

export default function SettingsPage() {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string | number>>({});
  const [saved, setSaved] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => get<SettingItem[]>('/settings'),
  });

  useEffect(() => {
    if (settings) {
      const map: Record<string, string | number> = {};
      (settings as unknown as SettingItem[]).forEach((s) => { map[s.key] = s.value; });
      setValues(map);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: { key: string; value: string | number }) =>
      patch(`/settings/${data.key}`, { value: data.value }),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setSaved(vars.key);
      toast.success('Impostazione salvata');
      setTimeout(() => setSaved(null), 2000);
    },
    onError: () => toast.error('Errore nel salvataggio'),
  });

  const handleSave = (key: string) => {
    saveMutation.mutate({ key, value: values[key] });
  };

  const settingsList = settings
    ? (settings as unknown as SettingItem[])
    : Object.keys(SETTING_META).map(k => ({ key: k, value: '' }));

  return (
    <>
      <Header title="Impostazioni" subtitle="Configurazione tenant" />
      <div className="p-6 space-y-6 max-w-3xl">

        <div className="card p-4 flex items-center gap-3 border-blue-500/20 bg-blue-500/5">
          <Settings size={16} className="text-blue-400 flex-shrink-0" />
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            Le impostazioni vengono salvate immediatamente e applicate a tutto il tenant.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-20" style={{ color: 'var(--text-3)' }}>Caricamento...</div>
        ) : (
          <div className="space-y-3">
            {settingsList.map(s => {
              const meta = SETTING_META[s.key];
              if (!meta) return null;
              const Icon = meta.icon;
              const isSaved = saved === s.key;
              return (
                <div key={s.key} className="card p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#3b82f618' }}>
                      <Icon size={15} style={{ color: '#3b82f6' }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">{meta.label}</p>
                      <p className="text-xs mt-0.5 mb-3" style={{ color: 'var(--text-3)' }}>{meta.description}</p>
                      <div className="flex gap-3">
                        {meta.type === 'select' ? (
                          <select
                            value={String(values[s.key] ?? s.value ?? '')}
                            onChange={e => setValues(prev => ({ ...prev, [s.key]: e.target.value }))}
                            className="input-dark flex-1">
                            {meta.options?.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input
                            type={meta.type === 'number' ? 'number' : 'text'}
                            value={String(values[s.key] ?? s.value ?? '')}
                            onChange={e => setValues(prev => ({ ...prev, [s.key]: meta.type === 'number' ? Number(e.target.value) : e.target.value }))}
                            className="input-dark flex-1"
                            onKeyDown={e => e.key === 'Enter' && handleSave(s.key)}
                          />
                        )}
                        <button onClick={() => handleSave(s.key)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isSaved ? 'bg-emerald-600 text-white' : 'btn-primary'}`}>
                          {isSaved ? <><CheckCircle size={13} /> Salvato</> : <><Save size={13} /> Salva</>}
                        </button>
                      </div>
                    </div>
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
