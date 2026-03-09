import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const CREATE_APP_URL = process.env.NEXT_PUBLIC_CREATE_APP_SERVICE_URL?.replace(/\/$/, '') || 'https://create-app-ms.fly.dev';

// GET - Get transaction statistics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    const response = await axios.get(
      `${CREATE_APP_URL}/api/v1/apps/${params.id}/transaction-stats`,
      {
        headers: {
          'Authorization': authHeader,
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching transaction stats:', error.response?.data || error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch transaction stats',
      },
      { status: error.response?.status || 500 }
    );
  }
}
