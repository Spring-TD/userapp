import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route to get the access token from httpOnly cookie
 * Used by the frontend to attach to API requests
 */
export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'No access token found' },
        { status: 401 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      accessToken 
    });
  } catch (error: any) {
    console.error('Get token error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get token' },
      { status: 500 }
    );
  }
}
