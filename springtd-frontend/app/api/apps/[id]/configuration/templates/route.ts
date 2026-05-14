import { NextRequest, NextResponse } from 'next/server';

const CREATE_APP_SERVICE_URL = process.env.CREATE_APP_SERVICE_URL || 'https://create-app-ms.fly.dev';

// GET - Get all templates for an app
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const appId = params.id;
        const authHeader = request.headers.get('Authorization');

        const response = await fetch(
            `${CREATE_APP_SERVICE_URL}/api/v1/apps/${appId}/configuration/templates`,
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
                { success: false, error: data.error || 'Failed to fetch templates' },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching templates:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST - Create a new template
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const appId = params.id;
        const authHeader = request.headers.get('Authorization');
        const body = await request.json();

        const response = await fetch(
            `${CREATE_APP_SERVICE_URL}/api/v1/apps/${appId}/configuration/templates`,
            {
                method: 'POST',
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
                { success: false, error: data.error || 'Failed to create template' },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error creating template:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
