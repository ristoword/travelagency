'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, UserPlus, FileText, Briefcase,
  Plane, Receipt, FolderOpen, BarChart3, Settings,
  Building2, ChevronDown, Globe, LogOut, Bell,
  Zap, MessageSquare, CheckSquare, MapPin,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href?: string;
  children?: NavItem[];
  badge?: string | number;
  color?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', color: '#3b82f6' },
  {
    label: 'CRM', icon: Users, color: '#8b5cf6', children: [
      { label: 'Clienti', icon: Users, href: '/crm/clients' },
      { label: 'Lead', icon: UserPlus, href: '/crm/leads' },
    ],
  },
  {
    label: 'Vendite', icon: FileText, color: '#06b6d4', children: [
      { label: 'Opportunità', icon: BarChart3, href: '/sales/opportunities' },
      { label: 'Preventivi', icon: FileText, href: '/sales/quotations' },
    ],
  },
  { label: 'Pratiche', icon: Briefcase, href: '/cases', color: '#f59e0b' },
  { label: 'Prenotazioni', icon: Plane, href: '/bookings', color: '#10b981' },
  {
    label: 'Contabilità', icon: Receipt, color: '#ef4444', children: [
      { label: 'Fatture', icon: Receipt, href: '/accounting/invoices' },
      { label: 'Pagamenti', icon: Receipt, href: '/accounting/payments' },
    ],
  },
  { label: 'Documenti', icon: FolderOpen, href: '/documents', color: '#64748b' },
  { label: 'Fornitori', icon: Building2, href: '/suppliers', color: '#84cc16' },
  { label: 'Comunicazioni', icon: MessageSquare, href: '/communications', color: '#06b6d4' },
  { label: 'Analytics', icon: BarChart3, href: '/analytics', color: '#6366f1' },
  { label: 'Workflows', icon: CheckSquare, href: '/workflows', color: '#f97316' },
  { label: 'Impostazioni', icon: Settings, href: '/settings', color: '#94a3b8' },
];

function NavItemComponent({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() =>
    item.children?.some(c => c.href && pathname.startsWith(c.href)) ?? false,
  );

  if (item.children) {
    const isActive = item.children.some(c => c.href && pathname.startsWith(c.href));
    return (
      <div>
        <button onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
            isActive
              ? 'text-white bg-[rgba(59,130,246,0.15)]'
              : 'text-[#8ca4c8] hover:text-white hover:bg-[rgba(255,255,255,0.04)]',
          )}>
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all',
            isActive ? 'bg-[rgba(59,130,246,0.2)]' : 'bg-[rgba(255,255,255,0.04)] group-hover:bg-[rgba(255,255,255,0.08)]')}>
            <item.icon size={14} style={{ color: isActive ? '#60a5fa' : item.color ?? '#8ca4c8' }} />
          </div>
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} style={{ color: '#4d6a8c' }} />
        </button>
        {open && (
          <div className="ml-5 mt-0.5 pl-3 border-l space-y-0.5" style={{ borderColor: 'rgba(59,130,246,0.15)' }}>
            {item.children.map(child => (
              <NavItemComponent key={child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = item.href
    ? item.href === '/dashboard'
      ? pathname === item.href
      : pathname.startsWith(item.href)
    : false;

  return (
    <Link href={item.href!}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
        isActive
          ? 'text-white bg-[rgba(59,130,246,0.15)] shadow-[0_0_15px_rgba(59,130,246,0.1)]'
          : 'text-[#8ca4c8] hover:text-white hover:bg-[rgba(255,255,255,0.04)]',
      )}>
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all',
        isActive
          ? 'bg-[rgba(59,130,246,0.25)]'
          : 'bg-[rgba(255,255,255,0.04)] group-hover:bg-[rgba(255,255,255,0.08)]')}>
        <item.icon size={14} style={{ color: isActive ? '#60a5fa' : item.color ?? '#8ca4c8' }} />
      </div>
      <span className="flex-1">{item.label}</span>
      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
      {item.badge !== undefined && (
        <span className="text-[10px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const { user, logout } = useAuthStore();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-50 border-r"
      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 glow-blue"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
          <Globe size={17} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">TravelAgency</p>
          <p className="text-[10px] mt-0.5 truncate max-w-[120px]" style={{ color: 'var(--text-3)' }}>
            {user?.tenantName ?? 'Management System'}
          </p>
        </div>
        <button className="ml-auto p-1.5 rounded-lg transition-colors hover:bg-[rgba(255,255,255,0.06)] relative">
          <Bell size={14} style={{ color: 'var(--text-2)' }} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-400 rounded-full" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest px-3 py-2" style={{ color: 'var(--text-3)' }}>
          Menu principale
        </p>
        {navItems.slice(0, 5).map(item => <NavItemComponent key={item.label} item={item} />)}

        <div className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />
        <p className="text-[10px] font-semibold uppercase tracking-widest px-3 py-2" style={{ color: 'var(--text-3)' }}>
          Operativo
        </p>
        {navItems.slice(5, 9).map(item => <NavItemComponent key={item.label} item={item} />)}

        <div className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />
        <p className="text-[10px] font-semibold uppercase tracking-widest px-3 py-2" style={{ color: 'var(--text-3)' }}>
          Strumenti
        </p>
        {navItems.slice(9).map(item => <NavItemComponent key={item.label} item={item} />)}
      </nav>

      {/* User */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'var(--bg-card)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-[10px] truncate" style={{ color: 'var(--text-3)' }}>{user?.email}</p>
          </div>
          <button onClick={() => logout()} title="Logout"
            className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10">
            <LogOut size={13} className="text-red-400" />
          </button>
        </div>
      </div>
    </aside>
  );
}
