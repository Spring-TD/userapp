import { NextRequest, NextResponse } from 'next/server';
import { BACKEND } from '@/lib/endpoints';

export const dynamic = 'force-dynamic';

const AUTH_MS_URL = process.env.NEXT_PUBLIC_API_URL || 'https://account-ms.fly.dev';

// POST /api/v1/password/reset — Public. Resets password using a valid reset token (from email link or OTP flow).
export async function POST(request: NextRequest) {
  const url = `${AUTH_MS_URL.replace(/\/+$/, '')}${BACKEND.password.reset}`;

  try {
    const body = await request.json();

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({ success: false, error: 'Invalid JSON from backend' }));
    return NextResponse.json(data, { status: response.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reset password';
    console.error('[Password Reset Proxy] Error:', message, 'URL:', url);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
