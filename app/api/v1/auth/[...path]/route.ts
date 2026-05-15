import { NextRequest, NextResponse } from 'next/server';
import { Auth, emailFromEmailExistsRequest } from '@/app/api/auth/[...path]/route';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ path: string[] }> };

function getPathKey(path: string[]) {
  return path.join('/');
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const key = getPathKey(await params.then((p) => p.path));
  if (key === 'get-token') return Auth.getToken(request);
  if (key === 'validate') return Auth.validateGet(request);
  if (key === 'me') return Auth.me(request);
  const emailParam = emailFromEmailExistsRequest(request, key);
  if (emailParam) return Auth.emailExists(request, emailParam);
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
  if (key === 'password/change/request-otp') return Auth.passwordChangeRequestOtp(request);
  if (key === 'logout') return Auth.logout(request);
  if (key === 'verify-token') return Auth.verifyTokenPost(request);
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const key = getPathKey(await params.then((p) => p.path));
  if (key === 'password/change') return Auth.passwordChange(request);
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
