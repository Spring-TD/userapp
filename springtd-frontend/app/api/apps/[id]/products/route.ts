import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/apps/[id]/products
 * Get all product activations for a specific app
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const appId = params.id;

        // TODO: Replace with actual database query
        // For now, return mock data or implement with your database
        // This should query the app_products table to get all product activations for this app

        // Mock implementation - replace with actual database query
        const activations = [
            // Example: { productId: 'product-1', appId: appId, isActive: true }
        ];

        return NextResponse.json({
            success: true,
            data: activations,
        });
    } catch (error) {
        console.error('Error fetching app product activations:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
