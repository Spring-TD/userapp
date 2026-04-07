import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';
import dns from 'dns';
import jwt from 'jsonwebtoken';
import { getApiUpstreamBase } from '@/lib/server/apiUpstreamBase';

export const dynamic = 'force-dynamic';

/** Create App routes: POST/GET /api/v1/apps — same upstream base as `.env` NEXT_PUBLIC_API_URL. */
const CREATE_APP_URL = getApiUpstreamBase();
// GET and POST first attempt use the same rule. If POST returns 401, we retry once with the alternate
// (original ↔ re-signed via transformJwtForBackend) so product-builder-style list + create both work.
const CREATE_APP_USE_ORIGINAL_TOKEN = process.env.CREATE_APP_USE_ORIGINAL_TOKEN !== 'false';
const JWT_SECRET = process.env.JWT_SECRET || 'Jb@1zP!k9#tW$xL&5aVn*QyR7gE^cF#Qb23'; // Fallback to service-auth-ms secret

// The upstream app API may use a different JWT_SECRET.
// Priority: CREATE_APP_JWT_SECRET env > JWT_SECRET env > upstream fallback ('fallback_secret_key')
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

        // Preserve expiration if still valid; otherwise default to 1 hour.
        const now = Math.floor(Date.now() / 1000);
        let secondsLeft =
          typeof decoded.exp === 'number' ? decoded.exp - now : 3600;
        if (!Number.isFinite(secondsLeft) || secondsLeft <= 0) {
          secondsLeft = 3600;
        }

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
            // Upstream app API verifies these exact claims:
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

/** Primary Authorization for apps proxy — must match GET when using the same env. */
function primaryAppsJwtAuthorization(authHeader: string): string {
    return CREATE_APP_USE_ORIGINAL_TOKEN ? authHeader : transformJwtForBackend(authHeader);
}

/** Opposite of primary (used for POST 401 retry). */
function alternateAppsJwtAuthorization(authHeader: string): string {
    return CREATE_APP_USE_ORIGINAL_TOKEN ? transformJwtForBackend(authHeader) : authHeader;
}

function validateCreateAppBody(input: {
    name?: unknown;
    websiteUrl?: unknown;
    alias?: unknown;
    description?: unknown;
    subdomain?: unknown;
}): { ok: true } | { ok: false; error: string } {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const websiteUrl = typeof input.websiteUrl === 'string' ? input.websiteUrl.trim() : '';
    const alias = typeof input.alias === 'string' ? input.alias.trim() : '';
    const description = typeof input.description === 'string' ? input.description.trim() : '';
    const subdomain =
        typeof input.subdomain === 'string' && input.subdomain.trim() ? input.subdomain.trim().toLowerCase() : undefined;

    if (!name || name.length < 3 || name.length > 100) {
        return { ok: false, error: 'name is required (3–100 characters)' };
    }
    if (!websiteUrl) {
        return { ok: false, error: 'websiteUrl is required' };
    }
    if (!alias || alias.length < 2 || alias.length > 50) {
        return { ok: false, error: 'alias is required (2–50 characters)' };
    }
    if (!description || description.length < 10 || description.length > 1000) {
        return { ok: false, error: 'description is required (10–1000 characters)' };
    }
    if (subdomain && !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(subdomain)) {
        return { ok: false, error: 'subdomain must be a valid hostname label' };
    }
    return { ok: true };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { name, websiteUrl, alias, description, subdomain } = body || {};
        const validation = validateCreateAppBody({ name, websiteUrl, alias, description, subdomain });
        if (!validation.ok) {
            return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
        }

        const nameStr = String(name).trim();
        const websiteUrlStr = String(websiteUrl).trim();
        const aliasStr = String(alias).trim();
        const descriptionStr = String(description).trim();
        const subdomainStr =
            typeof subdomain === 'string' && subdomain.trim()
                ? String(subdomain).trim().toLowerCase()
                : undefined;

        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // Allow API key bypass if keys are configured
            if (!CREATE_APP_API_KEY || !CREATE_APP_PUBLIC_KEY) {
                return NextResponse.json({ success: false, error: 'Authorization token is required. Please log in.' }, { status: 401 });
            }
        }

        const merchantId = await resolveMerchantId(authHeader, body?.merchantId as string | undefined);

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
        // Strategy 3: JWT — same primary strategy as GET; forward browser cookies so upstream can read accessToken cookie on POST.
        else if (authHeader) {
            const roleHint = extractPrimaryRoleFromAuthHeader(authHeader);
            const effectiveRole = roleHint || 'MERCHANT';
            headers['x-user-role'] = effectiveRole;
            headers['x-user-type'] = effectiveRole;
            headers['x-user-roles'] = effectiveRole;
            headers['Authorization'] = primaryAppsJwtAuthorization(authHeader);
            const browserCookie = request.headers.get('cookie');
            if (browserCookie) {
                headers['Cookie'] = browserCookie;
            }
        }

        const upstreamPayload: Record<string, unknown> = {
            name: nameStr,
            websiteUrl: websiteUrlStr,
            alias: aliasStr,
            description: descriptionStr,
        };
        if (merchantId) upstreamPayload.merchantId = merchantId;
        if (subdomainStr) upstreamPayload.subdomain = subdomainStr;

        let resp = await http.post(`${CREATE_APP_URL}/api/v1/apps`, upstreamPayload, { headers });

        if (
            resp.status === 401 &&
            authHeader &&
            authHeader.startsWith('Bearer ') &&
            !(CREATE_APP_API_KEY && CREATE_APP_PUBLIC_KEY) &&
            !CREATE_APP_BYPASS_TOKEN
        ) {
            const alt = alternateAppsJwtAuthorization(authHeader);
            if (alt !== headers['Authorization']) {
                const retryHeaders: Record<string, string> = {
                    ...headers,
                    Authorization: alt,
                    'Idempotency-Key': `create-app-retry-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                };
                const browserCookie = request.headers.get('cookie');
                if (browserCookie) {
                    retryHeaders['Cookie'] = browserCookie;
                }
                resp = await http.post(`${CREATE_APP_URL}/api/v1/apps`, upstreamPayload, { headers: retryHeaders });
            }
        }

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
                subdomain: appData.subdomain,
                defaultAppUrl: appData.defaultAppUrl,
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

        let headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Use same auth strategy as POST
        if (CREATE_APP_API_KEY && CREATE_APP_PUBLIC_KEY) {
            headers['X-Special-Key'] = CREATE_APP_API_KEY;
            headers['X-Public-Key'] = CREATE_APP_PUBLIC_KEY;
        } else if (CREATE_APP_BYPASS_TOKEN) {
            headers['Authorization'] = CREATE_APP_BYPASS_TOKEN.startsWith('Bearer ')
                ? CREATE_APP_BYPASS_TOKEN
                : `Bearer ${CREATE_APP_BYPASS_TOKEN}`;
        } else if (authHeader && authHeader.startsWith('Bearer ')) {
            const roleHint = extractPrimaryRoleFromAuthHeader(authHeader);

            // If no role found in token, default to MERCHANT for app operations
            const effectiveRole = roleHint || 'MERCHANT';

            headers['Authorization'] = primaryAppsJwtAuthorization(authHeader);
            headers['x-user-role'] = effectiveRole;
            headers['x-user-type'] = effectiveRole;
            headers['x-user-roles'] = effectiveRole;
        }

        const resp = await http.get(`${CREATE_APP_URL}/api/v1/apps`, { headers });

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
