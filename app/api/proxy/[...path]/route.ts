import { NextRequest, NextResponse } from 'next/server';

// Server-side proxy — forwards all /api/proxy/* requests to the VPS backend
// This avoids browser mixed-content blocks (HTTPS Vercel → HTTP VPS)

const BACKEND = process.env.BACKEND_URL || 'http://187.77.183.130';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path, 'GET');
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path, 'POST');
}
export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path, 'PUT');
}
export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path, 'DELETE');
}
export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path, 'PATCH');
}

async function proxy(req: NextRequest, pathSegments: string[], method: string) {
  const path    = pathSegments.join('/');
  const search  = req.nextUrl.search;
  const url     = `${BACKEND}/api/${path}${search}`;

  // Forward auth header if present
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const auth = req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;

  let body: string | undefined;
  if (method !== 'GET' && method !== 'DELETE') {
    try { body = await req.text(); } catch { /* no body */ }
  }

  try {
    const res = await fetch(url, { method, headers, body });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return NextResponse.json(
      { detail: `Proxy error: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 }
    );
  }
}
