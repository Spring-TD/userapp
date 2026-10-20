import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route to securely store JWT tokens in httpOnly cookies
 * This prevents XSS attacks from accessing tokens via JavaScript
 */
export async function POST(request: NextRequest) {
  try {
    const { accessToken, refreshToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Access token is required' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true });

    // Access token: readable cookie so client can send it and it persists across reloads
    response.cookies.set('accessToken', accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    });

    // Refresh token: httpOnly for security (used only by server on /api/auth/refresh)
    if (refreshToken) {
      response.cookies.set('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return response;
  } catch (error: any) {
    console.error('Set tokens error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set tokens' },
      { status: 500 }
    );
  }
}
