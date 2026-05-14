import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Spring App uses its own product-ms backend (separate from Plata's product-ms-plata)
// NEXT_PUBLIC_SPRING_PRODUCT_SERVICE_URL = https://product-ms.fly.dev
const PRODUCT_MS_URL = process.env.NEXT_PUBLIC_SPRING_PRODUCT_SERVICE_URL || 'https://product-ms.fly.dev';

// PUT - Toggle product activation
export async function PUT(
  request: NextRequest,
  { params }: { params: { merchantId: string; productId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const body = await request.json();
    const { merchantId, productId } = params;

    console.log('[Spring Products Toggle] PUT - Toggling:', merchantId, productId, body);

    const response = await fetch(`${PRODUCT_MS_URL}/api/v1/products/toggle/${merchantId}/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Spring Products Toggle] Error:', data);
      return NextResponse.json(data, { status: response.status });
    }

    console.log('[Spring Products Toggle] Success');
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Spring Products Toggle] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to toggle product' },
      { status: 500 }
    );
  }
}
