'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearMobileClientAuthError, forgotPasswordThunk } from '@/store/mobileClientAuthSlice';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((s) => s.mobileClientAuth);
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearMobileClientAuthError());
    }
  }, [error, dispatch]);

  const handleContinue = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError('Enter a valid email address.');
      toast.error('Enter a valid email address.');
      return;
    }
    setFieldError(null);
    const res = await dispatch(forgotPasswordThunk({ email: email.trim().toLowerCase() }));
    if (forgotPasswordThunk.rejected.match(res)) {
      toast.error(res.payload ?? 'Could not send reset instructions.');
      return;
    }
    toast.success('If an account exists for this email, you will receive reset instructions shortly.');
    router.push('/mobile-v2/auth/forgot-password/sent');
  };

  return (
    <div className="flex h-full flex-col sf-page-bg p-6 pt-12 text-[#1E293B]">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/mobile-v2/auth/login" className="-ml-2 rounded-full p-2 transition-colors hover:bg-black/5">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold">Forgot Password</h1>
        <div className="w-8" />
      </div>

      <div className="mb-10 max-w-[90%] text-left">
        <p className="text-[20px] font-bold leading-tight text-[var(--sf-ink,#1E1B4B)]">Enter your email and we’ll send you a link to reset your password.</p>
      </div>

      <div className="min-h-0 flex-1 space-y-6">
        <div className="group relative">
          <input
            id="email"
            type="email"
            placeholder=" "
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="peer h-14 w-full rounded-2xl border-0 bg-white px-4 pb-1 pt-4 text-base shadow-[0_2px_10px_rgba(0,0,0,0.03)] placeholder-transparent transition-all focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sf-primary,#2563EB)_20%,transparent)]"
          />
          <label
            htmlFor="email"
            className="pointer-events-none absolute left-4 top-1.5 text-[11px] font-medium text-gray-400 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-gray-400"
          >
            Email
          </label>
          {fieldError && <p className="mt-1 text-xs text-red-600">{fieldError}</p>}
        </div>
      </div>

      <div className="mb-4 mt-auto">
        <Button
          type="button"
          className="h-14 w-full rounded-[20px] bg-[var(--sf-button,#1E40AF)] text-base font-medium text-white shadow-lg shadow-blue-900/20 hover:bg-[var(--sf-button-hover,#1e3a8a)]"
          disabled={loading}
          onClick={handleContinue}
        >
          {loading ? 'Please wait…' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
