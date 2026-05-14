import { NextRequest, NextResponse } from 'next/server';

const CREATE_APP_SERVICE_URL = process.env.CREATE_APP_SERVICE_URL || 'https://create-app-ms.fly.dev';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const appId = params.id;
        const authHeader = request.headers.get('Authorization');

        const response = await fetch(
            `${CREATE_APP_SERVICE_URL}/api/v1/apps/${appId}/configuration`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authHeader && { Authorization: authHeader }),
                },
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: data.error || 'Failed to fetch configuration' },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching configuration:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const appId = params.id;
        const authHeader = request.headers.get('Authorization');
        const body = await request.json();

        const response = await fetch(
            `${CREATE_APP_SERVICE_URL}/api/v1/apps/${appId}/configuration`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authHeader && { Authorization: authHeader }),
                },
                body: JSON.stringify(body),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: data.error || 'Failed to update configuration' },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error updating configuration:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
