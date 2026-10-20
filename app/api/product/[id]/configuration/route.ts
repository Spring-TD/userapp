import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://account-ms.fly.dev').replace(/\/$/, '');

// GET - Get product configuration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${BASE_URL}/api/v1/configurations/${id}`,
      {
        headers: {
          'Authorization': authHeader,
        },
      }
    );

    // Return empty configuration if not found (404)
    if (response.status === 404) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No configuration found'
      });
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Failed to fetch configuration' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching configuration:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch configuration',
      },
      { status: 500 }
    );
  }
}

// POST - Create or update product configuration
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    // First try to get existing configuration
    let existingConfig = null;
    try {
      const getResponse = await fetch(
        `${BASE_URL}/api/v1/configurations/${id}`,
        {
          headers: {
            'Authorization': authHeader,
          },
        }
      );
      if (getResponse.ok) {
        const getData = await getResponse.json();
        existingConfig = getData?.data;
      }
    } catch {
      // Configuration doesn't exist, will create new
    }

    let response;
    if (existingConfig) {
      // Update existing configuration
      response = await fetch(
        `${BASE_URL}/api/v1/configurations/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify({ configuration: body.configuration }),
        }
      );
    } else {
      // Create new configuration
      response = await fetch(
        `${BASE_URL}/api/v1/configurations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify(body),
        }
      );
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Failed to save configuration' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error saving configuration:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to save configuration',
      },
      { status: 500 }
    );
  }
}
