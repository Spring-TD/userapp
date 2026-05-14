import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/product-builder/all
 * Fetch ALL products from Product Builder (global pool)
 * This endpoint should call the Product Builder microservice to get all products
 */
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // TODO: Replace with actual Product Builder API URL
        const PRODUCT_BUILDER_URL = process.env.PRODUCT_BUILDER_API_URL || 'http://localhost:3002';

        // Call Product Builder microservice to get all products
        const response = await fetch(`${PRODUCT_BUILDER_URL}/api/products/all`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: data.error || 'Failed to fetch products from Product Builder' },
                { status: response.status }
            );
        }

        return NextResponse.json({
            success: true,
            data: data.data || data,
        });
    } catch (error) {
        console.error('Error fetching products from Product Builder:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
