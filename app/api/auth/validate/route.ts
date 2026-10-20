import { NextRequest, NextResponse } from 'next/server';
import { BACKEND } from '@/lib/endpoints';
import { getPlataAuthApiBaseUrl } from '@/lib/plataAuthBaseUrl';

const cookieOpts = (maxAge: number, httpOnly: boolean) => ({
  httpOnly,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});

function userFromPayload(payload: Record<string, unknown>) {
  return {
    id: (payload.userId ?? payload.sub) as string,
    email: (payload.email ?? '') as string,
    firstName: (payload.firstName ?? payload.first_name ?? '') as string,
    lastName: (payload.lastName ?? payload.last_name ?? '') as string,
    role: (payload.userType ?? payload.role) as string | undefined,
  };
}

/**
 * If access token is missing or expired, try to refresh using refreshToken cookie.
 * Returns a response with new access (and optionally refresh) cookie set if refresh succeeds.
 */
async function tryRefreshAndRespond(request: NextRequest): Promise<NextResponse | null> {
  const refreshToken = request.cookies.get('refreshToken')?.value;
  if (!refreshToken) return null;

  const res = await fetch(`${getPlataAuthApiBaseUrl()}${BACKEND.auth.refresh}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) return null;

  const newAccess = data.data?.accessToken ?? data.accessToken;
  const newRefresh = data.data?.refreshToken ?? data.refreshToken;
  if (!newAccess) return null;

  const parts = newAccess.split('.');
  if (parts.length !== 3) return null;
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8')) as Record<string, unknown>;

  const response = NextResponse.json({
    success: true,
    valid: true,
    user: userFromPayload(payload),
  });
  response.cookies.set('accessToken', newAccess, cookieOpts(60 * 60, false));
  if (newRefresh) {
    response.cookies.set('refreshToken', newRefresh, cookieOpts(60 * 60 * 24 * 7, true));
  }
  return response;
}

/**
 * API Route to validate JWT token server-side.
 * If access token is missing or expired, attempts refresh using refreshToken cookie before returning 401.
 */
export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('accessToken')?.value;

    if (!accessToken) {
      const refreshResponse = await tryRefreshAndRespond(request);
      if (refreshResponse) return refreshResponse;
      return NextResponse.json(
        { success: false, valid: false, error: 'No access token found' },
        { status: 401 }
      );
    }

    try {
      const parts = accessToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token structure');
      }
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8')) as Record<string, unknown>;

      if (payload.exp && (payload.exp as number) * 1000 < Date.now()) {
        const refreshResponse = await tryRefreshAndRespond(request);
        if (refreshResponse) return refreshResponse;
        return NextResponse.json(
          { success: false, valid: false, error: 'Token expired' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        valid: true,
        user: userFromPayload(payload),
      });
    } catch {
      const refreshResponse = await tryRefreshAndRespond(request);
      if (refreshResponse) return refreshResponse;
      return NextResponse.json(
        { success: false, valid: false, error: 'Invalid token format' },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('Validate token error:', error);
    return NextResponse.json(
      { success: false, valid: false, error: 'Token validation failed' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for validating token against auth service
 * Use this for critical operations that require full server validation
 */
export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, valid: false, error: 'No access token found' },
        { status: 401 }
      );
    }

    // Validate against auth service
    const authResponse = await fetch(`${getPlataAuthApiBaseUrl()}${BACKEND.auth.me}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!authResponse.ok) {
      const errorData = await authResponse.json().catch(() => ({}));
      return NextResponse.json(
        { 
          success: false, 
          valid: false, 
          error: errorData.error || 'Token validation failed' 
        },
        { status: 401 }
      );
    }

    const userData = await authResponse.json();

    return NextResponse.json({
      success: true,
      valid: true,
      user: userData.data || userData.user || userData,
    });
  } catch (error: any) {
    console.error('Full token validation error:', error);
    return NextResponse.json(
      { success: false, valid: false, error: 'Token validation failed' },
      { status: 500 }
    );
  }
}
