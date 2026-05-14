'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';
import { Shield, LayoutDashboard, Building2, Users, LogOut, ChevronRight } from 'lucide-react';

const NAV = [
  { href: '/superadmin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/superadmin/tenants', label: 'Tenant & Licenze', icon: Building2 },
  { href: '/superadmin/users', label: 'Utenti', icon: Users },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname() ?? '/';

  useEffect(() => {
    if (pathname === '/superadmin/login') return;
    if (!isAuthenticated || !user?.isSuperAdmin) {
      router.replace('/superadmin/login');
    }
  }, [isAuthenticated, user, pathname, router]);

  if (pathname === '/superadmin/login') return <>{children}</>;
  if (!isAuthenticated || !user?.isSuperAdmin) return null;

  return (
    <div className="flex h-screen" style={{ background: '#050d1a' }}>
      {/* Sidebar */}
      <aside className="w-60 flex flex-col border-r" style={{ background: '#080f1e', borderColor: '#0d1f3c' }}>
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-5 border-b" style={{ borderColor: '#0d1f3c' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">SuperAdmin</p>
            <p className="text-[10px]" style={{ color: '#2a3f5e' }}>Sistema</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${active ? 'text-white font-medium' : 'hover:bg-[#0d1f3c]'}`}
                style={active ? { background: 'linear-gradient(135deg, #7c3aed20, #4f46e520)', color: 'white' } : { color: '#4d6a8c' }}>
                <Icon size={15} style={active ? { color: '#7c3aed' } : {}} />
                {label}
                {active && <ChevronRight size={12} className="ml-auto" style={{ color: '#7c3aed' }} />}
              </Link>
            );
          })}
        </nav>

        {/* User / logout */}
        <div className="p-3 border-t" style={{ borderColor: '#0d1f3c' }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-1" style={{ background: '#0d1f3c' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] truncate" style={{ color: '#2a3f5e' }}>{user?.email}</p>
            </div>
          </div>
          <button onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs transition-all hover:bg-[#0d1f3c]"
            style={{ color: '#4d6a8c' }}>
            <LogOut size={13} /> Esci
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
