'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CountrySelect } from '@/components/ui/country-select';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  clearMobileClientAuthError,
  generateOtpThunk,
  registerMobileUserThunk,
  emailExistsThunk,
} from '@/store/mobileClientAuthSlice';
import { isFuspayCustomerLinked } from '@/lib/fuspayRegistration';
import { buildMobileRegisterPayload, registrationVerificationEmailSent } from '@/lib/mobileRegistration';
import {
  normalizeRegistrationPhone,
  validateCountry,
  validateInternationalPhone,
  validateNamePart,
  validatePasswordForMobileUser,
} from '@/lib/mobileUserAuthValidation';
import type { MobileClientAuthReject } from '@/store/mobileClientAuthSlice';
import { AuthRouteSkeleton } from '@/components/mobile-v2/data-skeletons';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
import { StorefrontMerchantLogo } from '@/components/mobile-v2/StorefrontMerchantLogo';
import { readTenantFromSession } from '@/lib/mobileTenant/readTenantFromSession';
import { pickManifestIconUrl } from '@/lib/webAppManifest';
import { showAuthError } from '@/lib/showAuthError';
import {
  isMobileAuthDebugEnabled,
  mobileAuthError,
  mobileAuthLog,
  mobileAuthWarn,
  redactRegisterPayload,
  summarizeAxiosError,
} from '@/lib/mobileAuthDebug';

function resolveSignupTenant(tenant: ReturnType<typeof useMobileV2Tenant>) {
  const stored = readTenantFromSession();
  return {
    ready: tenant.ready,
    error: tenant.error,
    displayName: tenant.displayName,
    appId: tenant.appId ?? stored.appId,
    merchantId: tenant.merchantId ?? stored.merchantId,
    subdomain: tenant.tenantSubdomain ?? stored.subdomain,
  };
}

function SignupForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((s) => s.mobileClientAuth);
  const tenant = useMobileV2Tenant();
  const t = resolveSignupTenant(tenant);
  const tenantReady = t.ready;
  const tenantError = t.error;
  const displayName = t.displayName;
  const manifestIconUrl = pickManifestIconUrl(tenant.pwaManifest);
  const appId = t.appId;
  const merchantId = t.merchantId;
  const resolvedSubdomain = t.subdomain;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!error) return;
    setSubmitError(showAuthError(error));
    dispatch(clearMobileClientAuthError());
  }, [error, dispatch]);

  const validateForm = (): { ok: boolean; errors: Record<string, string> } => {
    const next: Record<string, string> = {};
    if (tenantReady && !merchantId && !resolvedSubdomain) {
      next.user_merchant_id =
        'This store could not be identified. Open the app from your tenant link (for example yourstore.tryspring.io), or add ?subdomain=… or ?merchant_id=… for local testing.';
    }
    const fn = validateNamePart(firstName, 'First name');
    if (fn) next.first_name = fn;
    const ln = validateNamePart(lastName, 'Last name');
    if (ln) next.last_name = ln;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    const ph = validateInternationalPhone(phone);
    if (ph) next.phone = ph;
    const c = validateCountry(country);
    if (c) next.country = c;
    const pw = validatePasswordForMobileUser(password);
    if (pw) next.password = pw;
    if (confirmPassword !== password) next.confirm_password = 'Passwords do not match.';
    if (!termsAccepted) next.terms = 'Please accept the terms to continue.';
    setFieldErrors(next);
    return { ok: Object.keys(next).length === 0, errors: next };
  };

  const handleRegister = async () => {
    if (isSubmitting) {
      console.log('[signup] blocked — already submitting');
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const signupTenant = resolveSignupTenant(tenant);
      console.log('[signup] 1 start', {
        tenantReady: signupTenant.ready,
        subdomain: signupTenant.subdomain,
        merchantId: signupTenant.merchantId,
        appId: signupTenant.appId,
        email: email.trim().toLowerCase(),
      });

      const { ok, errors } = validateForm();
      if (!ok) {
        mobileAuthWarn('signup:validationFailed', { errors });
        const first = Object.values(errors)[0];
        if (first) setSubmitError(showAuthError(first));
        return;
      }
      console.log('[signup] 2 validation passed');

      const existsRes = await dispatch(emailExistsThunk(email.trim()));
      console.log('[signup] 3 email-exists done', {
        type: existsRes.type,
        exists: existsRes.payload,
      });
      if (existsRes.payload === true) {
        setSubmitError(showAuthError('This email is already registered. Try signing in.'));
        return;
      }

      const normalizedPhone = normalizeRegistrationPhone(phone, country);
      const payload = buildMobileRegisterPayload({
        first_name: firstName,
        last_name: lastName,
        email,
        phone: normalizedPhone,
        country: country.trim().toUpperCase(),
        password,
        tenantSubdomain: signupTenant.subdomain,
        merchantId: signupTenant.merchantId,
        appId: signupTenant.appId,
      });

      console.log('[signup] 4 calling register', {
        url: '/api/v1/registration/user',
        payload: redactRegisterPayload(payload as unknown as Record<string, unknown>),
      });

      const regData = await dispatch(registerMobileUserThunk(payload)).unwrap();
      console.log('[signup] 5 register success', {
        userId: regData.user?.id,
        verificationEmailSent: regData.verificationEmailSent,
        fuspayProfileCreated: regData.fuspayProfileCreated,
        fuspayUserId: regData.fuspayUserId,
      });
      mobileAuthLog('signup:registerSuccess', {
        userId: regData.user?.id,
        verificationEmailSent: regData.verificationEmailSent,
        fuspayProfileCreated: regData.fuspayProfileCreated,
        fuspayUserId: regData.fuspayUserId,
      });

      if (!isFuspayCustomerLinked(regData)) {
        toast.message('Account created', {
          description: 'After email verification, sign in and complete identity verification with FusPay.',
        });
      }

      const walletNuban = regData.wallet?.virtualNuban?.accountNumber;
      if (walletNuban) {
        toast.success(`Account created. Your wallet account: ${walletNuban}`);
      }

      if (regData.walletProvisioningError) {
        toast.message('Account created', {
          description: 'Wallet setup is still in progress. You can continue with email verification.',
        });
      }

      const otpAlreadySent = registrationVerificationEmailSent(regData);
      if (!otpAlreadySent) {
        const gen = await dispatch(
          generateOtpThunk({
            identifier: payload.email,
            channel: 'email',
            purpose: 'verification',
          }),
        );
        if (generateOtpThunk.rejected.match(gen)) {
          toast.message('Account created', {
            description: 'We could not send a verification code. Tap Resend on the next screen.',
          });
        }
      } else {
        toast.success('Check your email for the 6-digit verification code.');
      }

      console.log('[signup] 6 navigate to verify-otp');
      router.push(`/mobile-v2/auth/verify-otp?email=${encodeURIComponent(payload.email)}`);
    } catch (err: unknown) {
      console.error('[signup] FAILED', err, summarizeAxiosError(err));
      mobileAuthError('signup:failed', {
        ...summarizeAxiosError(err),
        raw: err,
      });
      const p = err as MobileClientAuthReject | undefined;
      const msg =
        (typeof p === 'object' && p?.message) ||
        (typeof err === 'string' ? err : null) ||
        (err instanceof Error ? err.message : null) ||
        'Registration failed. Please check your details and try again.';
      if (p?.fieldErrors) {
        setFieldErrors((prev) => ({ ...prev, ...p.fieldErrors! }));
      }
      setSubmitError(showAuthError(msg));
    } finally {
      setIsSubmitting(false);
      mobileAuthLog('signup:finished');
    }
  };

  return (
    <div className="relative flex h-full flex-col sf-page-bg p-6 pt-12 text-[#1E293B]">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/mobile-v2" className="-ml-2 rounded-full p-2 transition-colors hover:bg-black/5">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold">Sign Up</h1>
        <Link href="/mobile-v2/auth/login" className="text-sm font-semibold text-[var(--sf-primary,#2563EB)] hover:underline">
          Login
        </Link>
      </div>

      <div className="mb-8 text-center">
        <div className="mb-4">
          <StorefrontMerchantLogo
            companyLogoUrl={tenant.branding?.companyLogoUrl}
            manifestIconUrl={manifestIconUrl}
            companyName={tenant.branding?.companyName ?? displayName}
          />
        </div>
        <h2 className="mb-2 text-[28px] font-bold tracking-tight text-[var(--sf-ink,#1E1B4B)]">
          Welcome to {displayName ?? 'your store'}
        </h2>
        <p className="px-4 text-[15px] leading-normal text-gray-500">Create your account with the details below</p>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        {!tenantReady && (
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700">Loading store configuration…</p>
        )}
        {submitError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
            {submitError}
          </p>
        )}
        {tenantError && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-900">{tenantError}</p>
        )}
        {isMobileAuthDebugEnabled() && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 font-mono text-[10px] text-slate-600">
            Debug on — open DevTools → Console, filter <strong>mobile-auth</strong>. Terminal shows{' '}
            <strong>[mobile-auth][proxy]</strong> for register requests.
          </p>
        )}
        {tenantReady && !merchantId && !resolvedSubdomain && !tenantError && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Missing tenant. Use your merchant storefront link (subdomain), or add{' '}
            <code className="font-mono">?subdomain=…</code> / <code className="font-mono">?merchant_id=…</code>{' '}
            for local testing.
          </p>
        )}

        <FloatingField
          id="first_name"
          label="First name"
          value={firstName}
          onChange={setFirstName}
          error={fieldErrors.first_name}
          autoComplete="given-name"
        />
        <FloatingField
          id="last_name"
          label="Last name"
          value={lastName}
          onChange={setLastName}
          error={fieldErrors.last_name}
          autoComplete="family-name"
        />
        <FloatingField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          error={fieldErrors.email}
          autoComplete="email"
        />
        <FloatingField
          id="phone"
          label="Phone (+country code)"
          value={phone}
          onChange={setPhone}
          error={fieldErrors.phone}
          autoComplete="tel"
        />
        <div className="space-y-1">
          <label htmlFor="country_select" className="sr-only">
            Country
          </label>
          <CountrySelect
            value={country}
            onValueChange={setCountry}
            placeholder="Select country"
            triggerClassName="h-14 w-full rounded-2xl border-0 bg-white px-4 text-base shadow-[0_2px_10px_rgba(0,0,0,0.03)] focus:ring-2 focus:ring-[var(--sf-primary,#2563EB)]/20"
          />
          {fieldErrors.country && <p className="text-xs text-red-600">{fieldErrors.country}</p>}
        </div>

        <div className="relative group">
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            placeholder=" "
            autoComplete="new-password"
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

        <div className="relative group">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            id="confirm_password"
            placeholder=" "
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="peer h-14 w-full rounded-2xl border-0 bg-white px-4 pb-1 pt-4 text-base shadow-[0_2px_10px_rgba(0,0,0,0.03)] placeholder-transparent transition-all focus:outline-none focus:ring-2 focus:ring-[var(--sf-primary,#2563EB)]/20"
          />
          <label
            htmlFor="confirm_password"
            className="pointer-events-none absolute left-4 top-1.5 text-[11px] font-medium text-gray-400 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-gray-400"
          >
            Confirm password
          </label>
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--sf-primary,#2563EB)] transition-colors hover:text-[var(--sf-button-hover,#1e3a8a)]"
          >
            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
          {fieldErrors.confirm_password && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.confirm_password}</p>
          )}
        </div>

        <div className="mt-6 flex items-start gap-3 px-1">
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onCheckedChange={(v) => setTermsAccepted(v === true)}
            className="mt-1 border-gray-400 data-[state=checked]:border-[var(--sf-primary,#2563EB)] data-[state=checked]:bg-[var(--sf-primary,#2563EB)]"
          />
          <label htmlFor="terms" className="text-sm leading-relaxed text-[#1E293B]">
            By signing up, you agree to the{' '}
            <Link href="/mobile-v2/profile/terms" className="text-[var(--sf-primary,#2563EB)]">
              Terms of Service and Privacy Policy
            </Link>
          </label>
        </div>
        {fieldErrors.terms && <p className="text-xs text-red-600">{fieldErrors.terms}</p>}
      </div>

      <div className="mb-4 mt-4 space-y-3">
        {submitError ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-900"
            role="alert"
          >
            {submitError}
          </p>
        ) : null}
        <Button
          type="button"
          className="h-14 w-full rounded-[20px] bg-[var(--sf-button,#1E40AF)] text-base font-medium text-white shadow-lg shadow-blue-900/20 hover:opacity-95"
          disabled={isSubmitting || loading || !tenantReady || (!merchantId && !resolvedSubdomain)}
          onClick={() => void handleRegister()}
        >
          {isSubmitting || loading ? 'Please wait…' : 'Register'}
        </Button>
      </div>
    </div>
  );
}

function FloatingField({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  type?: string
  autoComplete?: string
}) {
  return (
    <div className="space-y-1">
      <div className="group relative">
        <input
          id={id}
          type={type}
          placeholder=" "
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="peer h-14 w-full rounded-2xl border-0 bg-white px-4 pb-1 pt-4 text-base shadow-[0_2px_10px_rgba(0,0,0,0.03)] placeholder-transparent transition-all focus:outline-none focus:ring-2 focus:ring-[var(--sf-primary,#2563EB)]/20"
        />
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-4 top-1.5 text-[11px] font-medium text-gray-400 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-gray-400"
        >
          {label}
        </label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
export default function SignupPage() {
  return (
    <Suspense
      fallback={<AuthRouteSkeleton />}
    >
      <SignupForm />
    </Suspense>
  );
}

