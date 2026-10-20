import { NextRequest, NextResponse } from 'next/server';

import { getApiUpstreamBase } from '@/lib/server/apiUpstreamBase';

const API_UPSTREAM_BASE = getApiUpstreamBase();

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appId } = await params;
    const authHeader = request.headers.get('Authorization');
    const bodyText = await request.text();

    const response = await fetch(`${API_UPSTREAM_BASE}/api/v1/apps/${appId}/pwa/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
      },
      body: bodyText || '{}',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error publishing PWA:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
