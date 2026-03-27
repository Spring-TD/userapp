import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Spring App fetches products from Product Builder (Plata's product-ms)
// Products are created in Product Builder → stored in product-ms-plata.fly.dev
// Spring App displays those products for merchants to activate/deactivate
const PLATA_PRODUCT_MS_URL = process.env.NEXT_PUBLIC_PLATA_PRODUCT_SERVICE_URL || process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL || 'https://product-ms-plata.fly.dev';

// GET - Fetch ALL products from Plata's product-ms
// These are the global product catalog created in the Product Builder
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId');

    // Fetch all products from Plata's product-ms
    // If appId is provided, fetch products for that specific app
    let targetUrl: string;
    if (appId) {
      targetUrl = `${PLATA_PRODUCT_MS_URL}/api/v1/products/app/${encodeURIComponent(appId)}`;
    } else {
      targetUrl = `${PLATA_PRODUCT_MS_URL}/api/v1/products`;
    }

    console.log('[Spring Products Proxy] GET from Plata product-ms:', targetUrl);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Spring Products Proxy] Error:', data);
      return NextResponse.json(data, { status: response.status });
    }

    console.log('[Spring Products Proxy] Success - Products count:', data.data?.length || 0);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Spring Products Proxy] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
