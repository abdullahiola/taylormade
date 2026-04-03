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
  const url     = `${BACKEND}/${path}${search}`;

  // Build headers — forward auth and content-type from original request
  const headers: Record<string, string> = {};
  const auth = req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;

  const contentType = req.headers.get('content-type');
  const isMultipart = contentType?.includes('multipart/form-data');

  // For JSON requests, set Content-Type explicitly
  // For multipart (file uploads), forward the original header with boundary
  if (contentType && !isMultipart) {
    headers['Content-Type'] = contentType;
  } else if (isMultipart && contentType) {
    headers['Content-Type'] = contentType;
  }

  let body: BodyInit | undefined;
  if (method !== 'GET' && method !== 'DELETE') {
    try {
      if (isMultipart) {
        // Forward raw binary body for file uploads
        body = await req.arrayBuffer();
      } else {
        body = await req.text();
      }
    } catch { /* no body */ }
  }

  try {
    const res = await fetch(url, { method, headers, body });
    const resContentType = res.headers.get('content-type') || 'application/json';
    const data = await res.arrayBuffer();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': resContentType },
    });
  } catch (e) {
    return NextResponse.json(
      { detail: `Proxy error: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 }
    );
  }
}
