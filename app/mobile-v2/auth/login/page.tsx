'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearAuthError, loginThunk } from '@/store/authSlice';
import { clearMobileClientAuthError } from '@/store/mobileClientAuthSlice';
import { AuthRouteSkeleton } from '@/components/mobile-v2/data-skeletons';
import { showAuthError } from '@/lib/showAuthError';
import { resolvePostLoginPath } from '@/lib/userKycRouting';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';

const DEFAULT_POST_LOGIN = '/mobile-v2/home';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((s) => s.auth);
  const mobileErr = useAppSelector((s) => s.mobileClientAuth.error);
  const tenant = useMobileV2Tenant();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const verifiedEmail = searchParams.get('verified') === '1';

  useEffect(() => {
    const emailParam = searchParams.get('email')?.trim();
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  useEffect(() => {
    if (error) {
      setSubmitError(showAuthError(error));
      dispatch(clearAuthError());
    }
    if (mobileErr) {
      setSubmitError(showAuthError(mobileErr));
      dispatch(clearMobileClientAuthError());
    }
  }, [error, mobileErr, dispatch]);

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    setFieldErrors(next);
    return { ok: Object.keys(next).length === 0, errors: next };
  };

  const handleLogin = async () => {
    setSubmitError(null);
    if (!tenant.ready) {
      setSubmitError(showAuthError('Storefront is still loading. Please try again in a moment.'));
      return;
    }
    if (!tenant.tenantSubdomain && !tenant.appId && !tenant.merchantId) {
      setSubmitError(showAuthError('Open this app from your storefront link, or add ?subdomain=… for local testing.'));
      return;
    }
    const { ok, errors } = validate();
    if (!ok) {
      const msg = errors.email || errors.password;
      if (msg) setSubmitError(showAuthError(msg));
      return;
    }
    const res = await dispatch(loginThunk({
      email: email.trim().toLowerCase(),
      password,
      ...(tenant.tenantSubdomain ? { subdomain: tenant.tenantSubdomain } : {}),
      ...(tenant.appId ? { app_id: tenant.appId, appId: tenant.appId } : {}),
      ...(tenant.merchantId
        ? {
            user_merchant_id: tenant.merchantId,
            userMerchantId: tenant.merchantId,
            merchantId: tenant.merchantId,
          }
        : {}),
    }));
    if (loginThunk.rejected.match(res)) {
      const status = (res.error as { message?: string })?.message;
      setSubmitError(showAuthError(res.payload ?? status ?? 'Sign in failed.'));
      return;
    }

    toast.success('Signed in successfully.');
    const destination = await resolvePostLoginPath(searchParams.get('next'));
    router.push(destination);
  };

  return (
    <div className="flex h-full flex-col sf-page-bg p-6 pt-12 text-[#1E293B]">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/mobile-v2" className="-ml-2 rounded-full p-2 transition-colors hover:bg-black/5">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold">Login</h1>
        <Link href="/mobile-v2/auth/signup" className="text-sm font-semibold text-[var(--sf-primary,#2563EB)] hover:underline">
          Register
        </Link>
      </div>

      <div className="mb-10 text-center">
        <h2 className="mb-2 text-[28px] font-bold tracking-tight text-[var(--sf-ink,#1E1B4B)]">Welcome back</h2>
        <p className="px-4 text-[15px] leading-normal text-gray-500">
          {verifiedEmail
            ? 'Your email is verified. Sign in to complete identity verification with FusPay.'
            : 'Sign in with your email and password'}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-6">
        {verifiedEmail ? (
          <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
            Email verified successfully. Use the password you created during signup.
          </p>
        ) : null}
        {submitError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
            {submitError}
          </p>
        ) : null}
        <div className="group relative">
          <input
            id="email"
            type="email"
            placeholder=" "
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="peer h-14 w-full rounded-2xl border-0 bg-white px-4 pb-1 pt-4 text-base shadow-[0_2px_10px_rgba(0,0,0,0.03)] placeholder-transparent transition-all focus:outline-none focus:ring-2 focus:ring-[var(--sf-primary,#2563EB)]/20"
          />
          <label
            htmlFor="email"
            className="pointer-events-none absolute left-4 top-1.5 text-[11px] font-medium text-gray-400 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-gray-400"
          >
            Email
          </label>
          {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
        </div>

        <div className="group relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder=" "
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="peer h-14 w-full rounded-2xl border-0 bg-white px-4 pb-1 pt-4 text-base shadow-[0_2px_10px_rgba(0,0,0,0.03)] placeholder-transparent transition-all focus:outline-none focus:ring-2 focus:ring-[var(--sf-primary,#2563EB)]/20"
          />
          <label
            htmlFor="password"
            className="pointer-events-none absolute left-4 top-1.5 text-[11px] font-medium text-gray-400 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-gray-400"
          >
            Password
          </label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--sf-primary,#2563EB)] transition-colors hover:text-[var(--sf-button-hover,#1e3a8a)]"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
          {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
        </div>

        <div className="flex justify-end pt-2">
          <Link href="/mobile-v2/auth/forgot-password" className="text-sm font-medium text-[var(--sf-primary,#2563EB)] hover:underline">
            Forgot Password?
          </Link>
        </div>
      </div>

      <div className="mb-4 mt-8">
        <Button
          type="button"
          className="h-14 w-full rounded-[20px] bg-[var(--sf-button,#1E40AF)] text-base font-medium text-white shadow-lg shadow-blue-900/20 hover:opacity-95"
          disabled={loading || !tenant.ready}
          onClick={handleLogin}
        >
          {loading || !tenant.ready ? 'Please wait…' : 'Login'}
        </Button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthRouteSkeleton />}>
      <LoginPageInner />
    </Suspense>
  );
}
