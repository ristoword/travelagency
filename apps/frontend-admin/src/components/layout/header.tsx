'use client';

import { Search, Bell, Plus, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const breadcrumbMap: Record<string, string> = {
  dashboard: 'Dashboard',
  crm: 'CRM',
  clients: 'Clienti',
  leads: 'Lead',
  sales: 'Vendite',
  quotations: 'Preventivi',
  opportunities: 'Opportunità',
  cases: 'Pratiche',
  bookings: 'Prenotazioni',
  accounting: 'Contabilità',
  invoices: 'Fatture',
  documents: 'Documenti',
  suppliers: 'Fornitori',
  analytics: 'Analytics',
  workflows: 'Workflows',
  settings: 'Impostazioni',
};

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; href?: string; onClick?: () => void };
}

export function Header({ title, subtitle, action }: HeaderProps) {
  const { user } = useAuthStore();
  const pathname = usePathname();

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((s, i) => ({
    label: breadcrumbMap[s] ?? s,
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-6 h-16 border-b"
      style={{ background: 'rgba(13,21,38,0.95)', backdropFilter: 'blur(12px)', borderColor: 'var(--border)' }}>

      <div>
        {/* Breadcrumb */}
        {breadcrumbs.length > 1 && (
          <div className="flex items-center gap-1 mb-0.5">
            {breadcrumbs.map((b, i) => (
              <span key={b.href} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={10} style={{ color: 'var(--text-3)' }} />}
                {b.isLast
                  ? <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>{b.label}</span>
                  : <Link href={b.href} className="text-xs hover:text-blue-400 transition-colors" style={{ color: 'var(--text-3)' }}>{b.label}</Link>
                }
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-white">{title}</h1>
          {subtitle && <span className="text-xs px-2 py-0.5 rounded-full badge-blue">{subtitle}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
          <input placeholder="Cerca..." className="input-dark pl-8 pr-4 py-2 w-56 text-xs" />
        </div>

        {/* Notifications */}
        <button className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[rgba(255,255,255,0.06)]">
          <Bell size={15} style={{ color: 'var(--text-2)' }} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-400 rounded-full" />
        </button>

        {/* Action button */}
        {action && (
          action.href
            ? <Link href={action.href} className="btn-primary flex items-center gap-1.5 py-2">
                <Plus size={13} /> {action.label}
              </Link>
            : <button onClick={action.onClick} className="btn-primary flex items-center gap-1.5 py-2">
                <Plus size={13} /> {action.label}
              </button>
        )}

        {/* Avatar */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold cursor-pointer ml-1"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
          title={`${user?.firstName} ${user?.lastName}`}>
          {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
        </div>
      </div>
    </header>
  );
}
