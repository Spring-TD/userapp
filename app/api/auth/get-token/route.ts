import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET - Return access token from httpOnly cookie (for tokenManager / client)
 */
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('accessToken')?.value;
  if (!accessToken) {
    return NextResponse.json({ success: false, error: 'No access token found' }, { status: 401 });
  }
  return NextResponse.json({ success: true, accessToken });
}
