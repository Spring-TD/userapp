import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://service-auth-ms.fly.dev';

/**
 * API Route to refresh tokens using httpOnly cookie
 * Forwards refresh request to auth service and updates cookies
 */
export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'No refresh token found' },
        { status: 401 }
      );
    }

    // Call auth service to refresh tokens
    const authResponse = await fetch(`${AUTH_SERVICE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await authResponse.json();

    if (!authResponse.ok || !data.success) {
      // Clear invalid cookies
      const errorResponse = NextResponse.json(
        { success: false, error: data.error || 'Token refresh failed' },
        { status: 401 }
      );
      
      errorResponse.cookies.set('accessToken', '', { maxAge: 0, path: '/' });
      errorResponse.cookies.set('refreshToken', '', { maxAge: 0, path: '/' });
      
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

    const response = NextResponse.json({ success: true });

    // Update cookies with new tokens
    response.cookies.set('accessToken', newAccessToken, {
      httpOnly: true,
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
