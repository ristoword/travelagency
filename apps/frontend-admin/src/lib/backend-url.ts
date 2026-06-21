/**
 * URL del backend NestJS — letto a runtime (Railway Variables).
 * NON usare localhost in produzione.
 */
export function getBackendUrl(): string {
  const url = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '').trim();

  if (url) return url.replace(/\/$/, '');

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'BACKEND_URL non configurato sul servizio frontend Railway. ' +
      'Imposta BACKEND_URL=https://<url-backend>.up.railway.app nelle variabili del servizio frontend.',
    );
  }

  return 'http://localhost:3000';
}

export function isBackendMisconfigured(): string | null {
  if (process.env.NODE_ENV !== 'production') return null;
  const url = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '';
  if (!url) return 'BACKEND_URL mancante';
  if (/localhost|127\.0\.0\.1/i.test(url)) return `BACKEND_URL punta a localhost (${url}) — il backend non è raggiungibile dal container frontend`;
  return null;
}
