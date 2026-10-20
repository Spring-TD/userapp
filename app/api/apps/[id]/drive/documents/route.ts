import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://account-ms.fly.dev';
const APPS_BASE_URL = AUTH_SERVICE_URL.replace(/\/$/, '');

// POST - Upload document
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
      `${APPS_BASE_URL}/api/v1/apps/${id}/drive/documents`,
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
    console.error('Error uploading document:', error.response?.data || error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to upload document',
      },
      { status: error.response?.status || 500 }
    );
  }
}

// GET - Get documents
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
    const url = `${APPS_BASE_URL}/api/v1/apps/${id}/drive/documents${queryString ? `?${queryString}` : ''}`;

    const response = await axios.get(url, {
      headers: {
        'Authorization': authHeader,
      },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching documents:', error.response?.data || error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch documents',
      },
      { status: error.response?.status || 500 }
    );
  }
}
