import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route to clear JWT tokens from httpOnly cookies
 * Used during logout
 */
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });

    // Clear access token
    response.cookies.set('accessToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0, // Expire immediately
    });

    // Clear refresh token
    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0, // Expire immediately
    });

    return response;
  } catch (error: any) {
    console.error('Clear tokens error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear tokens' },
      { status: 500 }
    );
  }
}
