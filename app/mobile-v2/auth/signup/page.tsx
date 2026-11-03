'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TermsConsentSheet, legalPageHref } from '@/components/mobile-v2/TermsConsentSheet';
import {
  buildLegalDocs,
  clearSignupDraft,
  readSignupDraft,
  writeSignupDraft,
  type LegalTab,
} from '@/lib/legalContent';
import { supportFromManifest } from '@/lib/mobileManifestContent';
import { cn } from '@/lib/utils';
import { CountryPickerField } from '@/components/mobile-v2/CountryPickerField';
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
  const [consent, setConsent] = useState<Record<LegalTab, boolean>>({ terms: false, privacy: false });
  const termsAccepted = consent.terms && consent.privacy;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<LegalTab>('terms');
  const [agreeShake, setAgreeShake] = useState(0);
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

  const legalDocs = useMemo(
    () =>
      buildLegalDocs({
        storeName: tenant.branding?.companyName ?? displayName,
        supportEmail: supportFromManifest(tenant.pwaManifest).contactEmail,
      }),
    [tenant.branding?.companyName, displayName, tenant.pwaManifest],
  );

  // Restore the form (and any consent given on the full terms page) after returning from it.
  useEffect(() => {
    const d = readSignupDraft();
    if (d.firstName) setFirstName(d.firstName);
    if (d.lastName) setLastName(d.lastName);
    if (d.email) setEmail(d.email);
    if (d.phone) setPhone(d.phone);
    if (d.country) setCountry(d.country);
    if (d.consent) setConsent({ terms: d.consent.terms === true, privacy: d.consent.privacy === true });
  }, []);

  // Skip the very first run: it still holds the empty initial values and would wipe the draft before it's restored.
  const skipFirstDraftSave = useRef(true);
  useEffect(() => {
    if (skipFirstDraftSave.current) {
      skipFirstDraftSave.current = false;
      return;
    }
    writeSignupDraft({ firstName, lastName, email, phone, country, consent });
  }, [firstName, lastName, email, phone, country, consent]);

  const openSheet = useCallback((tab?: LegalTab) => {
    setSheetTab(tab ?? (consent.terms ? 'privacy' : 'terms'));
    setSheetOpen(true);
  }, [consent.terms]);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const acceptDoc = (tab: LegalTab) => {
    const next = { ...consent, [tab]: true };
    setConsent(next);
    setFieldErrors((prev) => {
      const { terms: _drop, ...rest } = prev;
      return rest;
    });
    // Move to the other document, or close once both are accepted.
    if (next.terms && next.privacy) setTimeout(() => setSheetOpen(false), 650);
    else setTimeout(() => setSheetTab(tab === 'terms' ? 'privacy' : 'terms'), 550);
  };

  const onAgreeBoxClick = () => {
    if (termsAccepted) setConsent({ terms: false, privacy: false });
    else openSheet();
  };

  const consentHint =
    consent.terms && !consent.privacy
      ? 'Terms accepted. Privacy Policy to go.'
      : consent.privacy && !consent.terms
        ? 'Privacy Policy accepted. Terms to go.'
        : '';

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
    if (!termsAccepted) {
      setAgreeShake((k) => k + 1);
      openSheet();
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

      clearSignupDraft();
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
    <div className="relative h-full overflow-hidden bg-[#0E0B1F]">
    <div
      className={cn(
        'relative flex h-full origin-top flex-col sf-page-bg p-6 pt-12 text-[#1E293B] transition-[transform,border-radius] duration-[550ms] ease-[cubic-bezier(.32,.72,0,1)]',
        sheetOpen && 'translate-y-2.5 scale-[0.92] overflow-hidden rounded-[30px]',
      )}
      aria-hidden={sheetOpen || undefined}
    >
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
        <CountryPickerField
          id="country"
          value={country}
          onChange={setCountry}
          error={fieldErrors.country}
        />

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

        <div
          key={agreeShake}
          className={cn('mt-6 flex items-start gap-3 px-1', agreeShake > 0 && 'animate-[signup-shake_.5s_ease]')}
        >
          <button
            type="button"
            role="checkbox"
            aria-checked={termsAccepted}
            aria-label="Agree to the Terms of Service and Privacy Policy"
            onClick={onAgreeBoxClick}
            className="-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center"
          >
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-lg border-[1.8px] transition-[background-color,border-color,transform] duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]',
                termsAccepted
                  ? 'scale-[1.08] border-[var(--sf-button,#1E40AF)] bg-[var(--sf-button,#1E40AF)]'
                  : 'border-gray-400 bg-white',
              )}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                <path
                  d="M2.5 7.4 L5.6 10.4 L11.5 3.8"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="16"
                  strokeDashoffset={termsAccepted ? 0 : 16}
                  style={{ transition: 'stroke-dashoffset .35s ease .08s' }}
                />
              </svg>
            </span>
          </button>
          <p className="text-[15px] leading-relaxed text-[#3F4457]">
            By signing up, you agree to the{' '}
            <button
              type="button"
              onClick={() => openSheet('terms')}
              className="inline font-medium text-[var(--sf-primary,#2563EB)] hover:underline"
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={() => openSheet('privacy')}
              className="inline font-medium text-[var(--sf-primary,#2563EB)] hover:underline"
            >
              Privacy Policy
            </button>
          </p>
        </div>
        <p className="ml-9 min-h-[18px] text-[13px] leading-snug text-[var(--sf-primary,#2563EB)]" aria-live="polite">
          {consentHint}
        </p>
        {fieldErrors.terms && <p className="text-xs text-red-600">{fieldErrors.terms}</p>}
        <p className="px-1 text-xs text-gray-400">
          Prefer the full text?{' '}
          <Link href={legalPageHref('terms', 'signup')} className="underline underline-offset-2">
            Read the full Terms &amp; Privacy
          </Link>
        </p>
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
          className={cn(
            'h-14 w-full rounded-[20px] bg-[var(--sf-button,#1E40AF)] text-base font-medium text-white shadow-lg shadow-blue-900/20 transition-opacity duration-300 hover:opacity-95',
            !termsAccepted && 'opacity-45 hover:opacity-55',
          )}
          disabled={isSubmitting || loading || !tenantReady || (!merchantId && !resolvedSubdomain)}
          onClick={() => void handleRegister()}
        >
          {isSubmitting || loading ? 'Please wait…' : 'Register'}
        </Button>
      </div>
    </div>
      <TermsConsentSheet
        open={sheetOpen}
        tab={sheetTab}
        onTabChange={setSheetTab}
        docs={legalDocs}
        consent={consent}
        onAccept={acceptDoc}
        onClose={closeSheet}
      />
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

