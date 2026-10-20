import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Base URL for all APIs (account-ms / product-ms).
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://account-ms.fly.dev').replace(/\/+$/, '');

/**
 * GET /api/products/types/[type]/subtypes
 * Proxies to backend GET /api/v1/products/types/{type}/subtypes
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ type: string }> },
) {
  try {
    const { type } = await context.params;
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${BASE_URL}/api/v1/products/types/${encodeURIComponent(type)}/subtypes`, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Failed to fetch product subtypes' },
        { status: response.status || 502 },
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Product subtypes error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product subtypes' },
      { status: 500 },
    );
  }
}

