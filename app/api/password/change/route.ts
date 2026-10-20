import { NextRequest, NextResponse } from 'next/server';
import { BACKEND } from '@/lib/endpoints';

export const dynamic = 'force-dynamic';

const AUTH_MS_URL = process.env.NEXT_PUBLIC_API_URL || 'https://account-ms.fly.dev';

// PUT /api/v1/password/change — Bearer. Changes the authenticated user's password (requires current password).
export async function PUT(request: NextRequest) {
  const url = `${AUTH_MS_URL.replace(/\/+$/, '')}${BACKEND.password.change}`;
  const authHeader = request.headers.get('Authorization');

  try {
    const body = await request.json();

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({ success: false, error: 'Invalid JSON from backend' }));
    return NextResponse.json(data, { status: response.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to change password';
    console.error('[Password Change Proxy] Error:', message, 'URL:', url);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
