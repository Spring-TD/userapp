'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearMobileClientAuthError, resendOtpThunk, verifyOtpThunk } from '@/store/mobileClientAuthSlice';
import { setSecureTokens } from '@/lib/tokenManager';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email')?.trim() ?? '';
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((s) => s.mobileClientAuth);
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(56);

  useEffect(() => {
    if (!email) {
      toast.error('Missing email. Start again from sign up.');
      router.replace('/mobile-v2/auth/signup');
    }
  }, [email, router]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearMobileClientAuthError());
    }
  }, [error, dispatch]);

  const handleConfirm = async () => {
    if (!email) return;
    if (code.length !== 6) {
      toast.warning('Enter the 6-digit code.');
      return;
    }
    const res = await dispatch(
      verifyOtpThunk({
        identifier: email,
        code,
        purpose: 'verification',
      }),
    );
    if (verifyOtpThunk.rejected.match(res)) {
      toast.error(res.payload ?? 'Invalid or expired code.');
      return;
    }
    const data = res.payload as {
      data?: { accessToken?: string; refreshToken?: string; tokens?: { accessToken?: string; refreshToken?: string } }
      accessToken?: string
      refreshToken?: string
    }
    const access =
      data?.data?.tokens?.accessToken ?? data?.data?.accessToken ?? data?.accessToken
    const refresh =
      data?.data?.tokens?.refreshToken ?? data?.data?.refreshToken ?? data?.refreshToken
    if (access) {
      await setSecureTokens(access, refresh)
    }
    toast.success('Email verified. You can sign in.');
    router.push('/mobile-v2/auth/login');
  };

  const handleResend = async () => {
    if (!email || seconds > 0) return;
    const res = await dispatch(
      resendOtpThunk({
        identifier: email,
        channel: 'email',
        purpose: 'verification',
      }),
    );
    if (resendOtpThunk.rejected.match(res)) {
      toast.error(res.payload ?? 'Could not resend code.');
      return;
    }
    setSeconds(56);
    toast.success('A new code has been sent.');
  };

  if (!email) return null;

  return (
    <div className="flex h-full flex-col bg-[#FAFAFA] p-6 pt-12 text-[#1E293B]">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/mobile-v2/auth/signup" className="-ml-2 rounded-full p-2 transition-colors hover:bg-black/5">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold">Verify email</h1>
        <div className="w-8" />
      </div>

      <div className="mb-6 self-start rounded-2xl bg-blue-50 p-3.5 text-[#2563EB]">
        <MessageSquare className="h-7 w-7 fill-current" />
      </div>

      <h2 className="mb-2 text-left text-2xl font-bold text-[#1E293B]">Enter OTP</h2>
      <p className="mb-8 text-left text-sm text-gray-500">
        We sent a one-time verification code to <span className="font-medium text-gray-700">{email}</span>
      </p>

      <div className="mb-8 w-full">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={(value) => setCode(value)}
          disabled={loading}
          autoFocus
          inputMode="numeric"
          pattern="[0-9]*"
          containerClassName="gap-3 justify-start w-full flex-nowrap"
        >
          <InputOTPGroup className="gap-3 flex-nowrap">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <InputOTPSlot
                key={idx}
                index={idx}
                className="h-10 w-10 rounded-full border-none bg-gray-200 p-0 text-base shadow-none ring-0 data-[active=true]:bg-[#2563EB] data-[active=true]:text-white data-[active=true]:ring-0"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      <p className="mb-8 text-left text-sm text-gray-500">
        {seconds > 0 ? (
          <>
            You can get code again in{' '}
            <span className="font-semibold text-[#2563EB]">{seconds} seconds</span>
          </>
        ) : (
          <button type="button" className="font-semibold text-[#2563EB] hover:underline" onClick={handleResend} disabled={loading}>
            Resend code
          </button>
        )}
      </p>

      <div className="mt-auto">
        <Button
          type="button"
          className="h-14 w-full rounded-full bg-[#1E40AF] text-base font-medium text-white shadow-lg shadow-blue-900/20 hover:bg-[#1e3a8a]"
          disabled={loading || code.length !== 6}
          onClick={handleConfirm}
        >
          {loading ? 'Please wait…' : 'Confirm'}
        </Button>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-[#FAFAFA] p-6 text-sm text-gray-500">Loading…</div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
