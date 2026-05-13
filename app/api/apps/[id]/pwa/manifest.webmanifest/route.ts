import { NextRequest, NextResponse } from 'next/server';

import { getApiUpstreamBase } from '@/lib/server/apiUpstreamBase';

const API_UPSTREAM_BASE = getApiUpstreamBase();
const UPSTREAM_TIMEOUT_MS = 8000;

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appId } = await params;
  const authHeader = request.headers.get('Authorization');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${API_UPSTREAM_BASE}/api/v1/apps/${encodeURIComponent(appId)}/pwa/manifest.webmanifest`,
      {
        method: 'GET',
        headers: {
          ...(authHeader && { Authorization: authHeader }),
        },
        signal: controller.signal,
      }
    );

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
    const aborted =
      error instanceof Error && (error.name === 'AbortError' || /aborted/i.test(error.message));
    console.error(
      `Error proxying PWA manifest for app ${appId} (upstream=${API_UPSTREAM_BASE}):`,
      error,
    );
    return NextResponse.json(
      {
        success: false,
        error: aborted
          ? `PWA manifest upstream timed out after ${UPSTREAM_TIMEOUT_MS}ms`
          : 'Failed to reach PWA manifest upstream',
      },
      { status: aborted ? 504 : 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
