import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Configuration routes are used by Plata's Product Builder (/dashboard/create-app/)
// Uses NEXT_PUBLIC_PLATA_PRODUCT_SERVICE_URL → product-ms-plata.fly.dev
const PRODUCT_MS_URL = process.env.NEXT_PUBLIC_PLATA_PRODUCT_SERVICE_URL || process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL || 'https://product-ms-plata.fly.dev';

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
      `${PRODUCT_MS_URL}/api/v1/configurations/${id}`,
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

    console.log('[Configuration API] POST - Product ID:', id);
    console.log('[Configuration API] Body:', JSON.stringify(body));
    console.log('[Configuration API] Auth header present:', !!authHeader);

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    // First try to get existing configuration
    let existingConfig = null;
    try {
      console.log('[Configuration API] Checking for existing config...');
      const getResponse = await fetch(
        `${PRODUCT_MS_URL}/api/v1/configurations/${id}`,
        {
          headers: {
            'Authorization': authHeader,
          },
        }
      );
      if (getResponse.ok) {
        const getData = await getResponse.json();
        existingConfig = getData?.data;
        console.log('[Configuration API] Existing config found:', !!existingConfig);
      }
    } catch (e) {
      // Configuration doesn't exist, will create new one
      console.log('[Configuration API] No existing config, will create new');
    }

    let response;
    if (existingConfig) {
      // Update existing configuration
      console.log('[Configuration API] Updating existing configuration');
      response = await fetch(
        `${PRODUCT_MS_URL}/api/v1/configurations/${id}`,
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
      console.log('[Configuration API] Creating new configuration');
      console.log('[Configuration API] POST URL:', `${PRODUCT_MS_URL}/api/v1/configurations`);
      console.log('[Configuration API] POST Body:', JSON.stringify(body));

      response = await fetch(
        `${PRODUCT_MS_URL}/api/v1/configurations`,
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

    console.log('[Configuration API] Response status:', response.status);
    const data = await response.json();
    console.log('[Configuration API] Response data:', JSON.stringify(data));

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
