import { NextRequest, NextResponse } from 'next/server';

import { getApiUpstreamBase } from '@/lib/server/apiUpstreamBase';

const API_UPSTREAM_BASE = getApiUpstreamBase();


// PUT - Update publishing status
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: appId } = await params;
        const authHeader = request.headers.get('Authorization');
        const body = await request.json();

        const response = await fetch(
            `${API_UPSTREAM_BASE}/api/v1/apps/${appId}/configuration/publishing`,
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
                { success: false, error: data.error || 'Failed to update publishing status' },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error updating publishing status:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
