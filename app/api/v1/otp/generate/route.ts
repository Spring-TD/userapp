import { NextRequest, NextResponse } from 'next/server';
import { BACKEND } from '@/lib/endpoints';

export const dynamic = 'force-dynamic';

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://account-ms.fly.dev')
  .replace(/\/+$/, '')
  .replace(/\/(api\/v1?)?\/?$/, '');

/**
 * POST /api/v1/otp/generate — Public.
 * Proxies to backend POST /api/v1/otp/generate.
 */
export async function POST(request: NextRequest) {
  const url = `${BASE_URL}${BACKEND.otp.generate}`;
  try {
    const body = await request.json().catch(() => ({}));
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({ success: false, error: 'Invalid JSON from backend' }));
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate OTP';
    console.error('[otp/generate]', msg, 'URL:', url);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
