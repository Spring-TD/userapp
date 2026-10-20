import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://account-ms.fly.dev';
const APPS_BASE_URL = AUTH_SERVICE_URL.replace(/\/$/, '');

// GET - Get app transactions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    const queryString = searchParams.toString();
    const url = `${APPS_BASE_URL}/api/v1/apps/${id}/transactions${queryString ? `?${queryString}` : ''}`;

    const response = await axios.get(url, {
      headers: {
        'Authorization': authHeader,
      },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching transactions:', error.response?.data || error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch transactions',
      },
      { status: error.response?.status || 500 }
    );
  }
}
