import { NextRequest, NextResponse } from 'next/server';

import { getApiUpstreamBase } from '@/lib/server/apiUpstreamBase';

const API_UPSTREAM_BASE = getApiUpstreamBase();

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appId } = await params;
    const authHeader = request.headers.get('Authorization');

    const response = await fetch(`${API_UPSTREAM_BASE}/api/v1/apps/${appId}/pwa/manifest.webmanifest`, {
      method: 'GET',
      headers: {
        ...(authHeader && { Authorization: authHeader }),
      },
    });

    const contentType =
      response.headers.get('content-type') || 'application/manifest+json';
    const body = await response.arrayBuffer();
    const cacheControl = response.headers.get('cache-control');
    const etag = response.headers.get('etag');

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
        ...(cacheControl && { 'Cache-Control': cacheControl }),
        ...(etag && { ETag: etag }),
      },
    });
  } catch (error) {
    console.error('Error proxying PWA manifest:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
