import { NextRequest, NextResponse } from 'next/server';
import { BACKEND } from '@/lib/endpoints';
import { getPlataAuthApiBaseUrl } from '@/lib/plataAuthBaseUrl';

export const dynamic = 'force-dynamic';

// POST - Proxy verify-account request to auth microservice
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const base = getPlataAuthApiBaseUrl();

        const response = await fetch(`${base}${BACKEND.auth.verifyAccount}`, {
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
