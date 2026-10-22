import { NextRequest, NextResponse } from 'next/server';

const TARGET_URL = 'https://14disun0wg.localto.net';

async function handleProxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace('/api/supabase', '');
  const search = request.nextUrl.search;
  const destination = `${TARGET_URL}${pathname}${search}`;

  const headers = new Headers(request.headers);
  headers.set('bypass-tunnel-reminder', 'true');
  headers.delete('host');

  try {
    const body = request.method !== 'GET' && request.method !== 'HEAD' 
      ? await request.blob() 
      : undefined;

    const response = await fetch(destination, {
      method: request.method,
      headers: headers,
      body: body,
      cache: 'no-store',
    });

    const data = await response.blob();
    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) { return handleProxy(req); }
export async function POST(req: NextRequest) { return handleProxy(req); }
export async function PUT(req: NextRequest) { return handleProxy(req); }
export async function DELETE(req: NextRequest) { return handleProxy(req); }
export async function PATCH(req: NextRequest) { return handleProxy(req); }
                            
