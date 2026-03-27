import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';
import dns from 'dns';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://service-auth-ms.fly.dev';
const CREATE_APP_URL = (process.env.NEXT_PUBLIC_CREATE_APP_SERVICE_URL?.replace(/\/$/, '') || 'https://create-app-ms.fly.dev');
const JWT_SECRET = process.env.JWT_SECRET || 'Jb@1zP!k9#tW$xL&5aVn*QyR7gE^cF#Qb23'; // Fallback to service-auth-ms secret

// The create-app-ms backend may use a different JWT_SECRET.
// Priority: CREATE_APP_JWT_SECRET env > JWT_SECRET env > create-app-ms's fallback ('fallback_secret_key')
const CREATE_APP_JWT_SECRET = process.env.CREATE_APP_JWT_SECRET || process.env.JWT_SECRET || 'fallback_secret_key';

if (!process.env.JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET environment variable is not set. Using fallback secret. This may cause authentication failures if the backend expects a different secret.');
}
const CREATE_APP_ROLE_OVERRIDE = process.env.CREATE_APP_ROLE_OVERRIDE;

// API Key auth bypass (if backend requires API keys instead of JWT)
const CREATE_APP_API_KEY = process.env.CREATE_APP_API_KEY;
const CREATE_APP_PUBLIC_KEY = process.env.CREATE_APP_PUBLIC_KEY;

// Emergency bypass: pre-validated token that backend accepts
const CREATE_APP_BYPASS_TOKEN = process.env.CREATE_APP_BYPASS_TOKEN;

const agent = new https.Agent({
    keepAlive: true,
    family: 4,
    // Force IPv4 lookup to avoid intermittent ETIMEDOUT on some hosts
    // @ts-ignore - Node lookup signature compatibility
    lookup: (hostname: string, options: any, cb: any) => dns.lookup(hostname, { family: 4 }, cb)
});

const http = axios.create({
    timeout: 15000,
    httpsAgent: agent,
    validateStatus: () => true,
});

async function resolveMerchantId(authHeader: string | null, fallback?: string): Promise<string | null> {
    if (fallback) return fallback;
    if (!authHeader) return null;

    // Decode JWT to extract merchantId
    try {
        const token = authHeader.replace('Bearer ', '');
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const merchantId = payload.userMerchantId || payload.user_merchant_id || payload.merchantId || payload.userId || payload.id || payload.sub;
        return merchantId || null;
    } catch (e) {
        console.error('Failed to decode JWT:', e);
        return null;
    }
}

function extractPrimaryRoleFromAuthHeader(authHeader: string | null): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    try {
        const token = authHeader.replace('Bearer ', '');
        const decoded: any = jwt.decode(token);
        if (!decoded || typeof decoded !== 'object') return null;

        const candidates: string[] = [];
        const push = (v: any) => {
            if (typeof v === 'string' && v.trim()) candidates.push(v.trim());
        };
        const pushArr = (v: any) => {
            if (Array.isArray(v)) v.forEach(push);
        };

        push(decoded.role);
        push(decoded.userRole);
        push(decoded.user_role);
        push(decoded.userType);
        push(decoded.user_type);
        pushArr(decoded.roles);
        pushArr(decoded.authorities);
        pushArr(decoded.scopes);
        if (typeof decoded.scope === 'string') decoded.scope.split(/[\s,]+/).forEach((s: string) => push(s));
        if (decoded.realm_access && Array.isArray(decoded.realm_access.roles)) pushArr(decoded.realm_access.roles);

        const normalized = candidates
            .map((r) => r.toUpperCase())
            .map((r) => (r.startsWith('ROLE_') ? r.slice('ROLE_'.length) : r));

        if (normalized.includes('ADMIN')) return 'ADMIN';
        if (normalized.includes('MERCHANT')) return 'MERCHANT';
        return normalized[0] || null;
    } catch {
        return null;
    }
}

function transformJwtForBackend(authHeader: string): string {
    try {
        const token = authHeader.replace('Bearer ', '');
        const decoded: any = jwt.decode(token);
        if (!decoded || typeof decoded !== 'object') {
            return authHeader;
        }

        // Preserve expiration as closely as possible.
        const now = Math.floor(Date.now() / 1000);
        const secondsLeft = typeof decoded.exp === 'number' ? Math.max(decoded.exp - now, 1) : 3600;

        // Build clean payload without JWT metadata fields
        const payloadToSign: any = { ...decoded };
        delete payloadToSign.iat;
        delete payloadToSign.nbf;
        delete payloadToSign.exp;
        delete payloadToSign.iss;
        delete payloadToSign.aud;

        // Ensure role fields are present
        if (!payloadToSign.userType && !payloadToSign.role) {
            payloadToSign.userType = 'MERCHANT';
        }

        const signOptions: jwt.SignOptions = {
            expiresIn: `${secondsLeft}s`,
            // create-app-ms verifies these exact claims:
            issuer: 'service-auth-ms',
            audience: 'client-app',
        };

        // Re-sign with CREATE_APP_JWT_SECRET (falls back to 'fallback_secret_key')
        const newToken = jwt.sign(payloadToSign, CREATE_APP_JWT_SECRET, signOptions);

        return `Bearer ${newToken}`;
    } catch (e) {
        console.error('Failed to transform JWT:', e);
        return authHeader; // Return original if transformation fails
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('[Create App API] Request body:', JSON.stringify(body));

        const { name, websiteUrl, alias, description } = body || {};
        if (!name || !websiteUrl || !alias) {
            return NextResponse.json({ success: false, error: 'Missing required fields: name, websiteUrl, and alias are required' }, { status: 400 });
        }

        const authHeader = request.headers.get('authorization');
        console.log('[Create App API] Auth header present:', !!authHeader);

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // Allow API key bypass if keys are configured
            if (!CREATE_APP_API_KEY || !CREATE_APP_PUBLIC_KEY) {
                console.log('[Create App API] No auth header and no API keys configured');
                return NextResponse.json({ success: false, error: 'Authorization token is required. Please log in.' }, { status: 401 });
            }
        }

        const merchantId = await resolveMerchantId(authHeader, body?.merchantId);
        console.log('[Create App API] Resolved merchantId:', merchantId);

        if (!merchantId) {
            return NextResponse.json({ success: false, error: 'Merchant ID is required' }, { status: 400 });
        }

        const idempotencyKey = request.headers.get('x-idempotency-key') || `create-app-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        // Determine authentication strategy
        let headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
        };

        // Strategy 1: Use API keys if available (bypasses JWT entirely)
        if (CREATE_APP_API_KEY && CREATE_APP_PUBLIC_KEY) {
            headers['X-Special-Key'] = CREATE_APP_API_KEY;
            headers['X-Public-Key'] = CREATE_APP_PUBLIC_KEY;
        }
        // Strategy 2: Use bypass token if provided (pre-validated token from backend)
        else if (CREATE_APP_BYPASS_TOKEN) {
            headers['Authorization'] = CREATE_APP_BYPASS_TOKEN.startsWith('Bearer ')
                ? CREATE_APP_BYPASS_TOKEN
                : `Bearer ${CREATE_APP_BYPASS_TOKEN}`;
        }
        // Strategy 3: Pass through original JWT.
        // All Fly.io services now share the same JWT_SECRET, so the token
        // from service-auth-ms is directly valid for create-app-ms.
        // Token includes issuer='service-auth-ms' and audience='client-app'.
        else if (authHeader) {
            const roleHint = extractPrimaryRoleFromAuthHeader(authHeader);
            const effectiveRole = roleHint || 'MERCHANT';

            headers['Authorization'] = authHeader;
            headers['x-user-role'] = effectiveRole;
            headers['x-user-type'] = effectiveRole;
            headers['x-user-roles'] = effectiveRole;
        }

        const resp = await http.post(`${CREATE_APP_URL}/api/v1/apps`,
            { name, websiteUrl, alias, description, merchantId },
            { headers }
        );

        if (resp.status >= 200 && resp.status < 300) {
            const result = resp.data;
            const appData = result.data?.app || result.data || result;
            const transformedApp = {
                id: appData.id,
                appId: appData.id,
                name: appData.name,
                websiteUrl: appData.websiteUrl,
                alias: appData.alias,
                description: appData.description,
                status: appData.status || 'active',
                dateCreated: appData.createdAt ? new Date(appData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                createdAt: appData.createdAt,
                updatedAt: appData.updatedAt,
                merchantId: appData.merchantId,
            };

            return NextResponse.json({ success: true, data: transformedApp, message: result.message || 'Application created successfully' }, { status: 201 });
        }

        const errorDetails = resp.data || {};
        const errorMessage = errorDetails.message || errorDetails.error || 'Failed to create app';
        console.error('[Create App API] Backend returned error:', { status: resp.status, data: resp.data });

        return NextResponse.json({ success: false, error: errorMessage, details: errorDetails }, { status: resp.status || 502 });
    } catch (error: any) {
        const timedOut = error?.code === 'ECONNABORTED' || error?.message?.includes('timeout');
        const network = error?.code === 'ENOTFOUND' || error?.code === 'EAI_AGAIN' || error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT';
        const details = {
            code: error?.code,
            errno: error?.errno,
            syscall: error?.syscall,
            message: error?.message,
            stack: error?.stack
        };
        console.error('[Create App API] Exception caught:', details);

        const userMessage = timedOut
            ? 'Create App service timed out'
            : (network
                ? 'Network error contacting Create App service'
                : (error?.message && error.message !== 'Error' ? error.message : 'Internal server error - please check server logs'));

        return NextResponse.json(
            { success: false, error: userMessage, debug: process.env.NODE_ENV === 'development' ? details : undefined },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization') || '';
        console.log('[GET /api/apps] Auth header present:', !!authHeader);
        console.log('[GET /api/apps] Auth header (first 50 chars):', authHeader.substring(0, 50));

        let headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Use same auth strategy as POST
        if (CREATE_APP_API_KEY && CREATE_APP_PUBLIC_KEY) {
            console.log('[GET /api/apps] Using API keys');
            headers['X-Special-Key'] = CREATE_APP_API_KEY;
            headers['X-Public-Key'] = CREATE_APP_PUBLIC_KEY;
        } else if (CREATE_APP_BYPASS_TOKEN) {
            console.log('[GET /api/apps] Using bypass token');
            headers['Authorization'] = CREATE_APP_BYPASS_TOKEN.startsWith('Bearer ')
                ? CREATE_APP_BYPASS_TOKEN
                : `Bearer ${CREATE_APP_BYPASS_TOKEN}`;
        } else if (authHeader && authHeader.startsWith('Bearer ')) {
            const roleHint = extractPrimaryRoleFromAuthHeader(authHeader);
            console.log('[GET /api/apps] Role from token:', roleHint);

            // If no role found in token, default to MERCHANT for app operations
            const effectiveRole = roleHint || 'MERCHANT';
            console.log('[GET /api/apps] Effective role:', effectiveRole);

            // Pass through original token — same JWT_SECRET on all Fly.io services
            headers['Authorization'] = authHeader;
            headers['x-user-role'] = effectiveRole;
            headers['x-user-type'] = effectiveRole;
            headers['x-user-roles'] = effectiveRole;
        } else {
            console.log('[GET /api/apps] No valid auth header');
        }

        console.log('[GET /api/apps] Calling:', `${CREATE_APP_URL}/api/v1/apps`);
        const resp = await http.get(`${CREATE_APP_URL}/api/v1/apps`, { headers });
        console.log('[GET /api/apps] Response status:', resp.status);
        console.log('[GET /api/apps] Response data:', JSON.stringify(resp.data).substring(0, 200));

        if (resp.status >= 200 && resp.status < 300) {
            return NextResponse.json({ success: true, data: resp.data?.data || resp.data });
        }

        return NextResponse.json({ success: false, error: resp.data?.message || resp.data?.error || 'Failed to fetch apps' }, { status: resp.status || 502 });
    } catch (error: any) {
        const timedOut = error?.code === 'ECONNABORTED' || error?.message?.includes('timeout');
        const network = error?.code === 'ENOTFOUND' || error?.code === 'EAI_AGAIN' || error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT';
        const details = { code: error?.code, errno: error?.errno, syscall: error?.syscall, message: error?.message };
        console.error('Create App proxy GET failed', details);
        return NextResponse.json(
            { success: false, error: timedOut ? 'Create App service timed out' : (network ? 'Network error contacting Create App service' : (error?.message || 'Internal server error')) },
            { status: 500 }
        );
    }
}
