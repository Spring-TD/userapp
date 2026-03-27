import { NextRequest, NextResponse } from 'next/server';

/**
 * PUT /api/apps/[id]/products/[productId]
 * Toggle product activation for a specific app
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string; productId: string } }
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
        const productId = params.productId;
        const body = await request.json();
        const { isActive } = body;

        if (typeof isActive !== 'boolean') {
            return NextResponse.json(
                { success: false, error: 'isActive must be a boolean' },
                { status: 400 }
            );
        }

        // TODO: Replace with actual database update
        // This should upsert into the app_products table
        // If the record exists, update isActive
        // If it doesn't exist, create a new record with appId, productId, and isActive

        console.log(`Toggling product ${productId} for app ${appId} to ${isActive}`);

        // Mock implementation - replace with actual database update
        const updatedActivation = {
            appId,
            productId,
            isActive,
            updatedAt: new Date().toISOString(),
        };

        return NextResponse.json({
            success: true,
            data: updatedActivation,
        });
    } catch (error) {
        console.error('Error toggling product activation:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
