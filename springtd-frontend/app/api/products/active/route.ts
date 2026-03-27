import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Mobile app reads products from Plata's product-ms (where products are created in Product Builder)
// Products activated by merchants on the Spring dashboard are shown here
const PLATA_PRODUCT_MS_URL = process.env.NEXT_PUBLIC_PLATA_PRODUCT_SERVICE_URL || process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL || 'https://product-ms-plata.fly.dev';

// GET - Fetch products for mobile app display
// Fetches from Plata's product-ms since that's where all products live
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        // Fetch all products from Plata's product-ms
        const response = await fetch(`${PLATA_PRODUCT_MS_URL}/api/v1/products`, {
            headers: {
                'Content-Type': 'application/json',
            },
            next: { revalidate: 30 } // cache for 30s to reduce cold starts
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: data.error || data.message || 'Failed to fetch products' },
                { status: response.status }
            );
        }

        // Filter by type if provided
        let products = data.data || [];
        if (type) {
            products = products.filter((p: any) => p.type === type);
        }

        return NextResponse.json({ success: true, data: products });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch products' },
            { status: 500 }
        );
    }
}
