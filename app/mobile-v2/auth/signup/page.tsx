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
import type { MobileUserRegistrationDto } from '@/types/mobileClientAuth';
import {
  validateCountry,
  validateInternationalPhone,
  validateNamePart,
  validatePasswordForMobileUser,
} from '@/lib/mobileUserAuthValidation';
import { AuthRouteSkeleton } from '@/components/mobile-v2/data-skeletons';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';

function SignupForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((s) => s.mobileClientAuth);
  const { ready: tenantReady, merchantId, error: tenantError } = useMobileV2Tenant();

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

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearMobileClientAuthError());
    }
  }, [error, dispatch]);

  const validateForm = (): { ok: boolean; errors: Record<string, string> } => {
    const next: Record<string, string> = {};
    if (tenantReady && !merchantId) {
      next.user_merchant_id =
        'This store could not be identified. Open the app from your tenant link (for example yourstore.tryspring.io), or add ?merchant_id=… to the URL for local testing.';
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
    const { ok, errors } = validateForm();
    if (!ok) {
      const first = Object.values(errors)[0];
      if (first) toast.error(first);
      return;
    }

    const existsRes = await dispatch(emailExistsThunk(email.trim()));
    if (emailExistsThunk.rejected.match(existsRes)) {
      toast.error(existsRes.payload ?? 'Could not verify email.');
      return;
    }
    if (existsRes.payload === true) {
      toast.error('This email is already registered. Try signing in.');
      return;
    }

    const payload: MobileUserRegistrationDto = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      // Backend expects ISO alpha-2 (e.g. NG), same as Spring/Plata CountrySelect values uppercased.
      country: country.trim().toUpperCase(),
      password,
    };

    const reg = await dispatch(registerMobileUserThunk(payload));
    if (registerMobileUserThunk.rejected.match(reg)) {
      toast.error(reg.payload ?? 'Registration failed.');
      return;
    }

    const gen = await dispatch(
      generateOtpThunk({
        identifier: payload.email,
        channel: 'email',
        purpose: 'verification',
      }),
    );
    if (generateOtpThunk.rejected.match(gen)) {
      toast.message('Account created', {
        description: 'We could not send a new code automatically. Use Resend on the next screen if needed.',
      });
    } else {
      toast.success('Check your email for the verification code.');
    }

    router.push(`/mobile-v2/auth/verify-otp?email=${encodeURIComponent(payload.email)}`);
  };

  return (
    <div className="relative flex h-full flex-col bg-[#FAFAFA] p-6 pt-12 text-[#1E293B]">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/mobile-v2" className="-ml-2 rounded-full p-2 transition-colors hover:bg-black/5">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold">Sign Up</h1>
        <Link href="/mobile-v2/auth/login" className="text-sm font-semibold text-[#2563EB] hover:underline">
          Login
        </Link>
      </div>

      <div className="mb-8 text-center">
        <h2 className="mb-2 text-[28px] font-bold tracking-tight text-[#1E1B4B]">Welcome to Airpay</h2>
        <p className="px-4 text-[15px] leading-normal text-gray-500">Create your account with the details below</p>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        {!tenantReady && (
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700">Loading store configuration…</p>
        )}
        {tenantError && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-900">{tenantError}</p>
        )}
        {tenantReady && !merchantId && !tenantError && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Missing tenant. Use your merchant storefront link (subdomain), or add{' '}
            <code className="font-mono">?merchant_id=…</code> for local testing.
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
            triggerClassName="h-14 w-full rounded-2xl border-0 bg-white px-4 text-base shadow-[0_2px_10px_rgba(0,0,0,0.03)] focus:ring-2 focus:ring-[#2563EB]/20"
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
            className="peer h-14 w-full rounded-2xl border-0 bg-white px-4 pb-1 pt-4 text-base shadow-[0_2px_10px_rgba(0,0,0,0.03)] placeholder-transparent transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
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
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2563EB] transition-colors hover:text-[#1d4ed8]"
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
            className="peer h-14 w-full rounded-2xl border-0 bg-white px-4 pb-1 pt-4 text-base shadow-[0_2px_10px_rgba(0,0,0,0.03)] placeholder-transparent transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
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
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2563EB] transition-colors hover:text-[#1d4ed8]"
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
            className="mt-1 border-gray-400 data-[state=checked]:border-[#2563EB] data-[state=checked]:bg-[#2563EB]"
          />
          <label htmlFor="terms" className="text-sm leading-relaxed text-[#1E293B]">
            By signing up, you agree to the{' '}
            <Link href="/mobile-v2/profile/terms" className="text-[#2563EB]">
              Terms of Service and Privacy Policy
            </Link>
          </label>
        </div>
        {fieldErrors.terms && <p className="text-xs text-red-600">{fieldErrors.terms}</p>}
      </div>

      <div className="mb-4 mt-4">
        <Button
          type="button"
          className="h-14 w-full rounded-[20px] bg-[#1E40AF] text-base font-medium text-white shadow-lg shadow-blue-900/20 hover:bg-[#1e3a8a]"
          disabled={loading || !tenantReady || !merchantId}
          onClick={handleRegister}
        >
          {loading ? 'Please wait…' : 'Register'}
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
          className="peer h-14 w-full rounded-2xl border-0 bg-white px-4 pb-1 pt-4 text-base shadow-[0_2px_10px_rgba(0,0,0,0.03)] placeholder-transparent transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
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

