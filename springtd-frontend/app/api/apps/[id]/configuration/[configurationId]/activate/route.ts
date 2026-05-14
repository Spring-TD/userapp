import { NextRequest, NextResponse } from 'next/server';

const CREATE_APP_SERVICE_URL = process.env.CREATE_APP_SERVICE_URL || 'https://create-app-ms.fly.dev';

// PUT - Activate a specific configuration
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string; configurationId: string } }
) {
    try {
        const { id: appId, configurationId } = params;
        const authHeader = request.headers.get('Authorization');

        const response = await fetch(
            `${CREATE_APP_SERVICE_URL}/api/v1/apps/${appId}/configuration/${configurationId}/activate`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authHeader && { Authorization: authHeader }),
                },
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: data.error || 'Failed to activate configuration' },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error activating configuration:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
