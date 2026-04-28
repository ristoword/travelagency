import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { post } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  roles: string[];
  permissions: string[];
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, tenantSlug?: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password, tenantSlug) => {
        set({ isLoading: true });
        try {
          const data = await post<{
            accessToken: string;
            refreshToken: string;
            user: AuthUser;
          }>('/auth/login', { email, password, tenantSlug });

          Cookies.set('access_token', data.accessToken, { expires: 1 });
          Cookies.set('refresh_token', data.refreshToken, { expires: 7 });
          Cookies.set('tenant_slug', data.user.tenantSlug, { expires: 7 });

          set({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await post('/auth/logout');
        } catch { /* ignore */ }
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        Cookies.remove('tenant_slug');
        set({ user: null, isAuthenticated: false });
        window.location.href = '/login';
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        if (user.roles.includes('super_admin') || user.roles.includes('Amministratore')) return true;
        return user.permissions.includes(permission);
      },

      hasRole: (role) => {
        const { user } = get();
        return user?.roles.includes(role) ?? false;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
