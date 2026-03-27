import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const CREATE_APP_URL = process.env.NEXT_PUBLIC_CREATE_APP_SERVICE_URL?.replace(/\/$/, '') || 'https://create-app-ms.fly.dev';

// POST - Add product key
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    const response = await axios.post(
      `${CREATE_APP_URL}/api/v1/apps/${params.id}/product-key`,
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error adding product key:', error.response?.data || error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to add product key',
      },
      { status: error.response?.status || 500 }
    );
  }
}

// DELETE - Remove product key
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    const response = await axios.delete(
      `${CREATE_APP_URL}/api/v1/apps/${params.id}/product-key`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        data: body,
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error removing product key:', error.response?.data || error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to remove product key',
      },
      { status: error.response?.status || 500 }
    );
  }
}
