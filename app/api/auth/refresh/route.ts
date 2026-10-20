import { NextRequest, NextResponse } from 'next/server';
import { BACKEND } from '@/lib/endpoints';
import axios from 'axios';
import https from 'https';
import dns from 'dns';
import { getPlataAuthApiBaseUrl } from '@/lib/plataAuthBaseUrl';

const agent = new https.Agent({
  keepAlive: true,
  family: 4,
  // Force IPv4 lookup to avoid intermittent ETIMEDOUT on some hosts
  // @ts-ignore - Node lookup signature compatibility
  lookup: (hostname: string, options: any, cb: any) => dns.lookup(hostname, { family: 4 }, cb),
});

const http = axios.create({
  timeout: 15_000,
  httpsAgent: agent,
  validateStatus: () => true,
});

/**
 * API Route to refresh tokens using httpOnly cookie
 * Forwards refresh request to auth service and updates cookies
 */
export async function POST(request: NextRequest) {
  try {
    let refreshToken = request.cookies.get('refreshToken')?.value;
    if (!refreshToken) {
      try {
        const body = await request.json().catch(() => ({}));
        refreshToken = (body as { refreshToken?: string })?.refreshToken;
      } catch {
        /* no body */
      }
    }
    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'No refresh token found' },
        { status: 401 }
      );
    }

    // Call auth service to refresh tokens (IPv4 agent avoids intermittent ETIMEDOUT)
    const authResponse = await http.post(
      `${getPlataAuthApiBaseUrl()}${BACKEND.auth.refresh}`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } },
    );

    const data = authResponse.data as any;

    if (!(authResponse.status >= 200 && authResponse.status < 300) || !data?.success) {
      // Do not clear access/refresh cookies here. A transient or endpoint-specific
      // 401 should not wipe the current session unexpectedly.
      const errorResponse = NextResponse.json(
        { success: false, error: data?.error || 'Token refresh failed' },
        { status: 401 }
      );
      return errorResponse;
    }

    // Extract new tokens
    const newAccessToken = data.data?.accessToken || data.accessToken;
    const newRefreshToken = data.data?.refreshToken || data.refreshToken;

    if (!newAccessToken) {
      return NextResponse.json(
        { success: false, error: 'No access token in refresh response' },
        { status: 500 }
      );
    }

    // Return tokens in body so client can update localStorage; also set cookies
    const response = NextResponse.json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

    // Access token: readable so client can use it after refresh
    response.cookies.set('accessToken', newAccessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    });

    if (newRefreshToken) {
      response.cookies.set('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return response;
  } catch (error: any) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}
