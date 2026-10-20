import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://account-ms.fly.dev';
const APPS_BASE_URL = AUTH_SERVICE_URL.replace(/\/$/, '');

// POST - Add product key
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    const response = await axios.post(
      `${APPS_BASE_URL}/api/v1/apps/${id}/product-key`,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    const response = await axios.delete(
      `${APPS_BASE_URL}/api/v1/apps/${id}/product-key`,
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
