import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';
import axios from 'axios';
import { BACKEND } from '@/lib/endpoints';
import { getPlataAuthApiBaseUrl } from '@/lib/plataAuthBaseUrl';

export const dynamic = 'force-dynamic';

// HTTPS agent that prefers IPv4 — avoids Node fetch AggregateError when IPv6/TLS fails to Fly.io
const httpsAgent = new https.Agent({
  family: 4,
  keepAlive: true,
});

// Origin only (no path). All backend paths in BACKEND already start with /api/v1/...
function getBaseUrl() {
  return getPlataAuthApiBaseUrl();
}

function buildUrl(path: string) {
  return `${getBaseUrl()}${path}`;
}

const axiosConfig = {
  httpsAgent,
  headers: { 'Content-Type': 'application/json' },
  validateStatus: () => true,
};

const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});

/**
 * Class-based auth handler: all auth + password + OTP logic in one place.
 * Use as Auth.getToken(request), Auth.login(request), etc.
 */
export class Auth {
  static getToken(request: NextRequest) {
    const accessToken = request.cookies.get('accessToken')?.value;
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'No access token found' }, { status: 401 });
    }
    return NextResponse.json({ success: true, accessToken });
  }

  static clearTokens() {
    const response = NextResponse.json({ success: true });
    response.cookies.set('accessToken', '', cookieOpts(0));
    response.cookies.set('refreshToken', '', cookieOpts(0));
    return response;
  }

  static async setTokens(request: NextRequest) {
    const { accessToken, refreshToken } = await request.json();
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Access token is required' }, { status: 400 });
    }
    const response = NextResponse.json({ success: true });
    response.cookies.set('accessToken', accessToken, cookieOpts(60 * 60));
    if (refreshToken) {
      response.cookies.set('refreshToken', refreshToken, cookieOpts(60 * 60 * 24 * 7));
    }
    return response;
  }

  static async login(request: NextRequest) {
    const loginUrl = buildUrl(BACKEND.auth.login);
    try {
      const body = await request.json();
      const res = await axios.post(loginUrl, body, axiosConfig);
      return NextResponse.json(res.data, { status: res.status });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      const cause = err instanceof Error && 'cause' in err ? (err as Error & { cause?: unknown }).cause : undefined;
      const causeDetail = cause instanceof Error ? cause.message : cause != null && typeof cause === 'object' && 'errors' in cause
        ? (cause as { errors?: unknown[] }).errors
        : String(cause);
      const isNetworkError = /fetch failed|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|network|abort|aggregate|timeout/i.test(String(msg));
      console.error('[Auth] login failed:', msg, { url: loginUrl, cause: causeDetail });
      const userMessage = isNetworkError
        ? 'Cannot reach auth server. Check that NEXT_PUBLIC_API_URL is set correctly and the auth service is running.'
        : msg;
      return NextResponse.json({ success: false, error: userMessage }, { status: 500 });
    }
  }

  static async register(request: NextRequest) {
    try {
      const body = await request.json();
      const res = await axios.post(buildUrl(BACKEND.registration.user), body, axiosConfig);
      return NextResponse.json(res.data, { status: res.status });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      console.error('[Auth] register:', msg);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }

  static async registerMerchant(request: NextRequest) {
    try {
      const body = await request.json();
      const res = await axios.post(buildUrl(BACKEND.registration.merchant), body, axiosConfig);
      return NextResponse.json(res.data, { status: res.status });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      console.error('[Auth] registerMerchant:', msg);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }

  static async refresh(request: NextRequest) {
    // Prefer cookie; allow body so client (e.g. api.ts interceptor) can refresh with localStorage token
    let refreshToken = request.cookies.get('refreshToken')?.value;
    if (!refreshToken) {
      try {
        const body = await request.json().catch(() => ({}));
        refreshToken = (body as { refreshToken?: string })?.refreshToken;
      } catch {
        // no body
      }
    }
    if (!refreshToken) {
      return NextResponse.json({ success: false, error: 'No refresh token found' }, { status: 401 });
    }
    try {
      const res = await axios.post(buildUrl(BACKEND.auth.refresh), { refreshToken }, axiosConfig);
      const data = res.data;
      if (res.status !== 200 || !data.success) {
        return NextResponse.json({ success: false, error: data.error || 'Token refresh failed' }, { status: 401 });
      }
      const newAccess = data.data?.accessToken ?? data.accessToken;
      const newRefresh = data.data?.refreshToken ?? data.refreshToken;
      if (!newAccess) {
        return NextResponse.json({ success: false, error: 'No access token in refresh response' }, { status: 500 });
      }
      // Return tokens in body so client (api.ts interceptor) can update localStorage; also set cookies
      const response = NextResponse.json({
        success: true,
        data: { accessToken: newAccess, refreshToken: newRefresh ?? undefined },
        accessToken: newAccess,
        refreshToken: newRefresh ?? undefined,
      });
      response.cookies.set('accessToken', newAccess, cookieOpts(60 * 60));
      if (newRefresh) response.cookies.set('refreshToken', newRefresh, cookieOpts(60 * 60 * 24 * 7));
      return response;
    } catch (err: unknown) {
      console.error('[Auth] refresh:', err);
      return NextResponse.json({ success: false, error: 'Failed to refresh token' }, { status: 500 });
    }
  }

  static validateGet(request: NextRequest) {
    const accessToken = request.cookies.get('accessToken')?.value;
    if (!accessToken) {
      return NextResponse.json({ success: false, valid: false, error: 'No access token found' }, { status: 401 });
    }
    try {
      const parts = accessToken.split('.');
      if (parts.length !== 3) throw new Error('Invalid token structure');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return NextResponse.json({ success: false, valid: false, error: 'Token expired' }, { status: 401 });
      }
      return NextResponse.json({
        success: true,
        valid: true,
        user: {
          id: payload.userId || payload.sub,
          email: payload.email,
          firstName: payload.firstName || payload.first_name || '',
          lastName: payload.lastName || payload.last_name || '',
          role: payload.userType || payload.role,
        },
      });
    } catch {
      return NextResponse.json({ success: false, valid: false, error: 'Invalid token format' }, { status: 401 });
    }
  }

  static async validatePost(request: NextRequest) {
    const accessToken = request.cookies.get('accessToken')?.value;
    if (!accessToken) {
      return NextResponse.json({ success: false, valid: false, error: 'No access token found' }, { status: 401 });
    }
    try {
      const res = await axios.get(buildUrl(BACKEND.auth.me), {
        ...axiosConfig,
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      });
      if (res.status !== 200) {
        const errData = res.data as { error?: string };
        return NextResponse.json({ success: false, valid: false, error: errData.error || 'Token validation failed' }, { status: 401 });
      }
      const userData = res.data;
      return NextResponse.json({
        success: true,
        valid: true,
        user: userData.data || userData.user || userData,
      });
    } catch (err: unknown) {
      console.error('[Auth] validate POST:', err);
      return NextResponse.json({ success: false, valid: false, error: 'Token validation failed' }, { status: 500 });
    }
  }

  static async verifyAccount(request: NextRequest) {
    try {
      const body = await request.json();
      const res = await axios.post(buildUrl(BACKEND.auth.verifyAccount), body, axiosConfig);
      return NextResponse.json(res.data, { status: res.status });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      console.error('[Auth] verifyAccount:', msg);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }

  static async verifyEmailOtp(request: NextRequest) {
    try {
      const body = await request.json();
      const authHeader = request.headers.get('Authorization');
      const backendBody = {
        identifier: body.identifier ?? body.email,
        code: body.code ?? body.otp,
        ...(body.purpose != null && { purpose: body.purpose }),
      };
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authHeader) headers['Authorization'] = authHeader;
      const res = await axios.post(buildUrl(BACKEND.otp.verify), backendBody, { ...axiosConfig, headers });
      return NextResponse.json(res.data, { status: res.status });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'OTP verification failed';
      console.error('[Auth] verifyEmailOtp:', msg);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }

  /** POST /api/v1/otp/resend — Public.
   * Accepts:
   * - { email }
   * - { identifier }
   * - { identifier, channel, purpose }
   */
  static async resendEmailOtp(request: NextRequest) {
    try {
      const body = (await request.json()) as Record<string, unknown>;
      const payload: Record<string, unknown> = {};

      const identifier = (body.identifier as string) ?? (body.email as string);
      if (identifier) {
        payload.identifier = identifier;
      }
      if (body.channel) {
        payload.channel = body.channel;
      }
      if (body.purpose) {
        payload.purpose = body.purpose;
      }

      const res = await axios.post(buildUrl(BACKEND.otp.resend), payload, axiosConfig);
      return NextResponse.json(res.data, { status: res.status });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend OTP';
      console.error('[Auth] resendEmailOtp (send code): FAILED', msg);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }

  /** POST /api/v1/password/forgot — Public. No auth. Sends password-reset link or OTP to the given email. */
  static async passwordForgot(request: NextRequest) {
    const url = buildUrl(BACKEND.password.forgot);
    try {
      const body = await request.json();
      const res = await axios.post(url, body, axiosConfig);
      return NextResponse.json(res.data, { status: res.status });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset link';
      console.error('[Auth] passwordForgot:', msg, 'URL:', url);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }

  static async passwordReset(request: NextRequest) {
    try {
      const body = await request.json();
      const res = await axios.post(buildUrl(BACKEND.password.reset), body, axiosConfig);
      return NextResponse.json(res.data, { status: res.status });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password';
      console.error('[Auth] passwordReset:', msg);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }

  static async passwordChange(request: NextRequest) {
    try {
      const body = await request.json();
      const authHeader = request.headers.get('Authorization');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authHeader) headers['Authorization'] = authHeader;
      const res = await axios.put(buildUrl(BACKEND.password.change), body, { ...axiosConfig, headers });
      return NextResponse.json(res.data, { status: res.status });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      console.error('[Auth] passwordChange:', msg);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }

  static async logout(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');
    const cookieToken = request.cookies.get('accessToken')?.value;
    const bearer =
      authHeader || (cookieToken ? `Bearer ${cookieToken}` : null);
    if (!bearer) {
      const cleared = NextResponse.json({ success: true });
      cleared.cookies.set('accessToken', '', cookieOpts(0));
      cleared.cookies.set('refreshToken', '', cookieOpts(0));
      return cleared;
    }
    try {
      const res = await axios.post(buildUrl(BACKEND.auth.logout), {}, {
        ...axiosConfig,
        headers: { Authorization: bearer, 'Content-Type': 'application/json' },
      });
      const out = NextResponse.json(res.data ?? { success: true }, { status: res.status });
      out.cookies.set('accessToken', '', cookieOpts(0));
      out.cookies.set('refreshToken', '', cookieOpts(0));
      return out;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Logout failed';
      console.error('[Auth] logout:', msg);
      const out = NextResponse.json({ success: false, error: msg }, { status: 500 });
      out.cookies.set('accessToken', '', cookieOpts(0));
      out.cookies.set('refreshToken', '', cookieOpts(0));
      return out;
    }
  }

  static async me(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');
    const cookieToken = request.cookies.get('accessToken')?.value;
    const token = authHeader?.replace(/^Bearer\s+/i, '') || cookieToken;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
      const res = await axios.get(buildUrl(BACKEND.auth.me), {
        ...axiosConfig,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      return NextResponse.json(res.data, { status: res.status });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load profile';
      console.error('[Auth] me:', msg);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }

  static async verifyTokenPost(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');
    const cookieToken = request.cookies.get('accessToken')?.value;
    const bearer = authHeader || (cookieToken ? `Bearer ${cookieToken}` : null);
    if (!bearer) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
      const body = await request.json().catch(() => ({}));
      const res = await axios.post(buildUrl(BACKEND.auth.verifyToken), body, {
        ...axiosConfig,
        headers: { Authorization: bearer, 'Content-Type': 'application/json' },
      });
      return NextResponse.json(res.data, { status: res.status });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Token verification failed';
      console.error('[Auth] verifyToken:', msg);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }

  static async emailExists(request: NextRequest, email: string) {
    if (!email?.trim()) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }
    const url = buildUrl(BACKEND.auth.emailExists(email));
    try {
      const res = await axios.get(url, axiosConfig);
      return NextResponse.json(res.data, { status: res.status });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      console.error('[Auth] emailExists:', msg, url);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }
}

type RouteParams = { params: Promise<{ path: string[] }> };

function getPathKey(path: string[]) {
  return path.join('/');
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const key = getPathKey(await params.then((p) => p.path));
  if (key === 'get-token') return Auth.getToken(request);
  if (key === 'validate') return Auth.validateGet(request);
  if (key === 'me') return Auth.me(request);
  if (key.startsWith('email-exists/')) {
    const email = decodeURIComponent(key.slice('email-exists/'.length));
    return Auth.emailExists(request, email);
  }
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const key = getPathKey(await params.then((p) => p.path));
  if (key === 'clear-tokens') return Auth.clearTokens();
  if (key === 'set-tokens') return Auth.setTokens(request);
  if (key === 'validate') return Auth.validatePost(request);
  if (key === 'refresh') return Auth.refresh(request);
  if (key === 'login') return Auth.login(request);
  if (key === 'register') return Auth.register(request);
  if (key === 'register/merchant') return Auth.registerMerchant(request);
  if (key === 'verify-account') return Auth.verifyAccount(request);
  if (key === 'verify-email-otp') return Auth.verifyEmailOtp(request);
  if (key === 'resend-email-otp') return Auth.resendEmailOtp(request);
  if (key === 'password/forgot') return Auth.passwordForgot(request);
  if (key === 'password/reset') return Auth.passwordReset(request);
  if (key === 'logout') return Auth.logout(request);
  if (key === 'verify-token') return Auth.verifyTokenPost(request);
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const key = getPathKey(await params.then((p) => p.path));
  if (key === 'password/change') return Auth.passwordChange(request);
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
