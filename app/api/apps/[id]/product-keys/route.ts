import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://account-ms.fly.dev';
const APPS_BASE_URL = AUTH_SERVICE_URL.replace(/\/$/, '');

// GET - Get product keys
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    const response = await axios.get(
      `${APPS_BASE_URL}/api/v1/apps/${id}/product-keys`,
      {
        headers: {
          'Authorization': authHeader,
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching product keys:', error.response?.data || error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch product keys',
      },
      { status: error.response?.status || 500 }
    );
  }
}
