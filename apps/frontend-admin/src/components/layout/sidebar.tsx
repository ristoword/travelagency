'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, UserPlus, FileText, Briefcase,
  Plane, Receipt, FolderOpen, BarChart3, Settings,
  Building2, ChevronDown, ChevronRight, MapPin, LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href?: string;
  children?: NavItem[];
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  {
    label: 'CRM', icon: Users, children: [
      { label: 'Clienti', icon: Users, href: '/crm/clients' },
      { label: 'Lead', icon: UserPlus, href: '/crm/leads' },
    ],
  },
  {
    label: 'Vendite', icon: FileText, children: [
      { label: 'Opportunità', icon: BarChart3, href: '/sales/opportunities' },
      { label: 'Preventivi', icon: FileText, href: '/sales/quotations' },
    ],
  },
  { label: 'Pratiche Viaggio', icon: Briefcase, href: '/cases' },
  { label: 'Prenotazioni', icon: Plane, href: '/bookings' },
  {
    label: 'Contabilità', icon: Receipt, children: [
      { label: 'Fatture', icon: Receipt, href: '/accounting/invoices' },
      { label: 'Pagamenti', icon: Receipt, href: '/accounting/payments' },
      { label: 'Note di credito', icon: Receipt, href: '/accounting/credit-notes' },
    ],
  },
  { label: 'Documenti', icon: FolderOpen, href: '/documents' },
  { label: 'Analytics', icon: BarChart3, href: '/analytics' },
  { label: 'Fornitori', icon: Building2, href: '/suppliers' },
  { label: 'Impostazioni', icon: Settings, href: '/settings' },
];

function NavItemComponent({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() =>
    item.children?.some((c) => c.href && pathname.startsWith(c.href)) ?? false,
  );

  if (item.children) {
    const isActive = item.children.some((c) => c.href && pathname.startsWith(c.href));
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActive ? 'text-white bg-sidebar-active' : 'text-sidebar-text hover:text-white hover:bg-sidebar-hover',
          )}
        >
          <item.icon size={18} />
          <span className="flex-1 text-left">{item.label}</span>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {open && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-700 pl-3">
            {item.children.map((child) => (
              <NavItemComponent key={child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = item.href ? pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)) : false;

  return (
    <Link
      href={item.href!}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'text-white bg-sidebar-active'
          : 'text-sidebar-text hover:text-white hover:bg-sidebar-hover',
      )}
    >
      <item.icon size={18} />
      <span>{item.label}</span>
      {item.badge && (
        <span className="ml-auto bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const { user, logout } = useAuthStore();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <MapPin size={16} className="text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-none">Travel Agency</p>
          <p className="text-slate-400 text-xs mt-0.5">{user?.tenantName ?? 'Admin Panel'}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavItemComponent key={item.label} item={item} />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-700 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-slate-400 text-xs truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => logout()}
            className="text-slate-400 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
