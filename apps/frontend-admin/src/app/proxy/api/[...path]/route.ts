import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend-url';

const HOP_BY_HOP = new Set(['host', 'connection', 'content-length', 'transfer-encoding']);

async function proxy(req: NextRequest, pathSegments: string[]) {
  let backendUrl: string;
  try {
    backendUrl = getBackendUrl();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Backend URL non configurato';
    return NextResponse.json(
      { success: false, message, statusCode: 503, timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }

  const path = pathSegments.join('/');
  const target = `${backendUrl}/api/${path}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    headers.set(key, value);
  });

  let body: string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.text();
  }

  try {
    const res = await fetch(target, {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.timeout(30000),
    });

    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      if (HOP_BY_HOP.has(key.toLowerCase())) return;
      responseHeaders.set(key, value);
    });

    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Proxy error';
    return NextResponse.json(
      {
        success: false,
        message: `Impossibile contattare il backend (${backendUrl}): ${message}`,
        statusCode: 502,
        timestamp: new Date().toISOString(),
      },
      { status: 502 },
    );
  }
}

type RouteCtx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
