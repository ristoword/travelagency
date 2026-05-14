import { NextResponse } from 'next/server';

export async function GET() {
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
    backend: {
      reachable: backendReachable,
      status: backendStatus,
      error: backendError || null,
      healthUrl: `${backendUrl}/health`,
    },
  });
}
