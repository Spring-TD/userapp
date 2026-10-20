import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://account-ms.fly.dev';
const APPS_BASE_URL = AUTH_SERVICE_URL.replace(/\/$/, '');

// GET - Get app by ID
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
      `${APPS_BASE_URL}/api/v1/apps/${id}`,
      {
        headers: {
          'Authorization': authHeader,
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching app:', error.response?.data || error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch app',
      },
      { status: error.response?.status || 500 }
    );
  }
}

// PUT - Update app
export async function PUT(
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

    const response = await axios.put(
      `${APPS_BASE_URL}/api/v1/apps/${id}`,
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
    console.error('Error updating app:', error.response?.data || error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to update app',
      },
      { status: error.response?.status || 500 }
    );
  }
}

// DELETE - Delete app
export async function DELETE(
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

    const response = await axios.delete(
      `${APPS_BASE_URL}/api/v1/apps/${id}`,
      {
        headers: {
          'Authorization': authHeader,
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error deleting app:', error.response?.data || error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to delete app',
      },
      { status: error.response?.status || 500 }
    );
  }
}
