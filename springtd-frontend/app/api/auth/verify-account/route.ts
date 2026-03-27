import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const AUTH_MS_URL = process.env.NEXT_PUBLIC_API_URL || 'https://service-auth-ms.fly.dev';

// POST - Proxy verify-account request to auth microservice
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        console.log('[Auth Verify Proxy] POST - Forwarding verify-account request');

        const response = await fetch(`${AUTH_MS_URL}/api/v1/auth/verify-account`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
      
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[Auth Verify Proxy] Error:', error.message);
        return NextResponse.json(
            { success: false, error: error.message || 'Verification failed' },
            { status: 500 }
        );
    }
}
