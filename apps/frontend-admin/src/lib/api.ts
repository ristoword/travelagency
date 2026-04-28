import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TENANT_SLUG = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || 'demo-agenzia';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-Slug': TENANT_SLUG,
  },
});

// Request interceptor — attach access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = Cookies.get('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const tenantSlug = Cookies.get('tenant_slug') || TENANT_SLUG;
  config.headers['X-Tenant-Slug'] = tenantSlug;
  return config;
});

// Response interceptor — handle 401 → refresh or redirect
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(`${API_URL}/api/v1/auth/refresh`, null, {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
            'X-Tenant-Slug': Cookies.get('tenant_slug') || TENANT_SLUG,
          },
        });

        const { data } = res.data;
        Cookies.set('access_token', data.accessToken, { expires: 1 });
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        Cookies.remove('tenant_slug');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

// ── Generic helpers ───────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get<ApiResponse<T>>(url, { params });
  return res.data.data;
}

export async function post<T>(url: string, data?: unknown): Promise<T> {
  const res = await api.post<ApiResponse<T>>(url, data);
  return res.data.data;
}

export async function patch<T>(url: string, data?: unknown): Promise<T> {
  const res = await api.patch<ApiResponse<T>>(url, data);
  return res.data.data;
}

export async function del(url: string): Promise<void> {
  await api.delete(url);
}
