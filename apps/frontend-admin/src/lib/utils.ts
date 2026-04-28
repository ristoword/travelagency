import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency = 'EUR',
): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

export function formatDate(
  date: string | Date | null | undefined,
  fmt = 'dd/MM/yyyy',
): string {
  if (!date) return '—';
  return format(new Date(date), fmt, { locale: it });
}

export function formatDatetime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: it });
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: it });
}

export function getInitials(firstName?: string | null, lastName?: string | null): string {
  return `${(firstName ?? '').charAt(0)}${(lastName ?? '').charAt(0)}`.toUpperCase();
}

export function getClientName(client: {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
}): string {
  if (client.companyName) return client.companyName;
  return `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() || '—';
}

export function truncate(str: string | null | undefined, length = 50): string {
  if (!str) return '—';
  return str.length > length ? `${str.slice(0, length)}...` : str;
}
