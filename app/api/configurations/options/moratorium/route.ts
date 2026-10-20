import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Base URL for all APIs (account-ms).
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://account-ms.fly.dev').replace(/\/+$/, '');

/**
 * GET /api/configurations/options/moratorium
 * Proxies to backend GET /api/v1/configurations/options/moratorium
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const response = await fetch(`${BASE_URL}/api/v1/configurations/options/moratorium`, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Failed to fetch moratorium options' },
        { status: response.status || 502 }
      );
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Moratorium options error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch moratorium options' },
      { status: 500 }
    );
  }
}
