import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const AUTH_MS_URL = process.env.NEXT_PUBLIC_API_URL || 'https://service-auth-ms.fly.dev';

// POST - Proxy login request to auth microservice
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        console.log('[Auth Login Proxy] POST - Forwarding login request to:', `${AUTH_MS_URL}/api/v1/auth/login`);

        const response = await fetch(`${AUTH_MS_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
      
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[Auth Login Proxy] Error:', data);
            return NextResponse.json(data, { status: response.status });
        }

        console.log('[Auth Login Proxy] Login successful');
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[Auth Login Proxy] Error:', error.message);
        return NextResponse.json(
            { success: false, error: error.message || 'Login failed' },
            { status: 500 }
        );
    }
}
