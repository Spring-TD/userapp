import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const AUTH_MS_URL = process.env.NEXT_PUBLIC_API_URL || 'https://service-auth-ms.fly.dev';

// POST - Proxy merchant registration request
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const response = await fetch(`${AUTH_MS_URL}/api/v1/auth/register/merchant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
      
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        console.error('[Auth Register Merchant Proxy] Error:', error.message);
        return NextResponse.json(
            { success: false, error: error.message || 'Registration failed' },
            { status: 500 }
        );
    }
}
