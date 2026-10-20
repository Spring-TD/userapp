import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Base URL for all APIs (account-ms / product-ms).
// We keep using the account-ms-plata domain as instructed.
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://account-ms.fly.dev').replace(/\/+$/, '');

/**
 * GET /api/products/types
 * Proxies to backend GET /api/v1/products/types
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${BASE_URL}/api/v1/products/types`, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Failed to fetch product types' },
        { status: response.status || 502 },
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Product types error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product types' },
      { status: 500 },
    );
  }
}

