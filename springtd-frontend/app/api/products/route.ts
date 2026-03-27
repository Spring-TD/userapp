import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Product Builder uses its own Product MS instance
const PRODUCT_BUILDER_MS_URL = 'https://product-ms-plata.fly.dev';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    console.log('[Product Builder API] Creating product:', body);

    const response = await fetch(`${PRODUCT_BUILDER_MS_URL}/api/v1/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Product Builder API] Error:', data);
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Failed to create product' },
        { status: response.status }
      );
    }

    console.log('[Product Builder API] Product created successfully');
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Product Builder API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId');
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    let url = `${PRODUCT_BUILDER_MS_URL}/api/v1/products`;
    if (appId) {
      url = `${PRODUCT_BUILDER_MS_URL}/api/v1/products/app/${appId}`;
    }

    console.log('[Product Builder API] Fetching products from:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Product Builder API] Error:', data);
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Failed to fetch products' },
        { status: response.status }
      );
    }

    console.log('[Product Builder API] Products fetched:', data.data?.length || 0);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Product Builder API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
