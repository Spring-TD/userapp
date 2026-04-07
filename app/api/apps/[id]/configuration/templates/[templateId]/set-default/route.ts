import { NextRequest, NextResponse } from 'next/server';

import { getApiUpstreamBase } from '@/lib/server/apiUpstreamBase';

const API_UPSTREAM_BASE = getApiUpstreamBase();


/** Maps to Create App MS: PATCH …/pwa-templates/:templateId/apply (set applied template for PWA). */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; templateId: string }> }
) {
    try {
        const { id: appId, templateId } = await params;
        const authHeader = request.headers.get('Authorization');

        const response = await fetch(
            `${API_UPSTREAM_BASE}/api/v1/apps/${appId}/pwa-templates/${templateId}/apply`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authHeader && { Authorization: authHeader }),
                },
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: data.error || 'Failed to set default template' },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error setting default template:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
