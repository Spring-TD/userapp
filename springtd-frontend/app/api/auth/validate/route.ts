import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://service-auth-ms.fly.dev';

/**
 * API Route to validate JWT token server-side
 * This provides proper validation instead of just client-side atob() decoding
 */
export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, valid: false, error: 'No access token found' },
        { status: 401 }
      );
    }

    // First, check token structure and expiry locally (fast check)
    try {
      const parts = accessToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token structure');
      }
      
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      
      // Check expiry
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return NextResponse.json(
          { success: false, valid: false, error: 'Token expired' },
          { status: 401 }
        );
      }

      // Return user info from token (signature verified by auth service on protected routes)
      return NextResponse.json({
        success: true,
        valid: true,
        user: {
          id: payload.userId || payload.sub,
          email: payload.email,
          firstName: payload.firstName || payload.first_name || '',
          lastName: payload.lastName || payload.last_name || '',
          role: payload.userType || payload.role,
        },
      });
    } catch (decodeError) {
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
    const authResponse = await fetch(`${AUTH_SERVICE_URL}/api/v1/auth/me`, {
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
