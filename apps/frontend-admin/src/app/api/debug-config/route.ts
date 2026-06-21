import { NextResponse } from 'next/server';
import { getBackendUrl, isBackendMisconfigured } from '@/lib/backend-url';

export async function GET() {
  const misconfigured = isBackendMisconfigured();
  let backendUrl: string;
  try {
    backendUrl = getBackendUrl();
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'BACKEND_URL non configurato',
      misconfigured: true,
    }, { status: 503 });
  }

  let backendReachable = false;
  let backendError = '';
  let backendStatus = 0;

  try {
    const res = await fetch(`${backendUrl}/health`, { signal: AbortSignal.timeout(5000) });
    backendReachable = res.ok;
    backendStatus = res.status;
  } catch (e: unknown) {
    backendError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    BACKEND_URL: backendUrl,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    NEXT_PUBLIC_DEFAULT_TENANT_SLUG: process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG,
    misconfigured: misconfigured || (!backendReachable && backendError ? `Backend non raggiungibile: ${backendError}` : null),
    backend: {
      reachable: backendReachable,
      status: backendStatus,
      error: backendError || null,
      healthUrl: `${backendUrl}/health`,
    },
    hint: misconfigured
      ? 'Su Railway: servizio FRONTEND → Variables → BACKEND_URL = URL pubblico del servizio BACKEND (non localhost, non l\'URL del frontend)'
      : null,
  });
}
