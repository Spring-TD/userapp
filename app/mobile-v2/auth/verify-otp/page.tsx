'use client';

/**
 * Email OTP after signup (or after an unverified login), styled after the "new kyc flow" prototype:
 * six code cells + on-screen keypad, auto-check on the 6th digit, resend countdown.
 * Calls: POST /api/v1/otp/verify (purpose=verification) · POST /api/v1/otp/generate for resend.
 */

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ClipboardPaste, Delete, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppDispatch } from '@/store/hooks';
import { clearMobileClientAuthError, resendOtpThunk, verifyOtpThunk } from '@/store/mobileClientAuthSlice';
import { clearSecureTokens } from '@/lib/tokenManager';
import { TickCircle, kycMotion as s } from '@/components/mobile-v2/kyc-onboarding/ui';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 56;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

type Status = 'idle' | 'checking' | 'ok';

function formatCountdown(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email')?.trim() ?? '';
  const fromLogin = searchParams.get('from') === 'login';
  const dispatch = useAppDispatch();

  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const [canPaste, setCanPaste] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const backHref = fromLogin ? `/mobile-v2/auth/login?email=${encodeURIComponent(email)}` : '/mobile-v2/auth/signup';

  useEffect(() => {
    if (!email) {
      toast.error(fromLogin ? 'Missing email. Start again from login.' : 'Missing email. Start again from sign up.');
      router.replace(fromLogin ? '/mobile-v2/auth/login' : '/mobile-v2/auth/signup');
    }
  }, [email, fromLogin, router]);

  useEffect(() => {
    setCanPaste(typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function');
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const verify = useCallback(
    async (value: string) => {
      if (!email || value.length !== CODE_LENGTH) return;
      setStatus('checking');
      setError(null);
      try {
        await dispatch(verifyOtpThunk({ identifier: email, code: value, purpose: 'verification' })).unwrap();
      } catch (err: unknown) {
        dispatch(clearMobileClientAuthError());
        const msg =
          (typeof err === 'string' ? err : null) ||
          (err instanceof Error ? err.message : null) ||
          'That code is wrong or has expired.';
        setError(msg);
        setStatus('idle');
        setCode('');
        setShakeKey((k) => k + 1);
        return;
      }

      setStatus('ok');
      await clearSecureTokens();
      const kycNext = `/mobile-v2/profile/kyc/create?from=registration&email=${encodeURIComponent(email)}`;
      setTimeout(() => {
        toast.success('Email verified. Sign in to continue.');
        router.push(`/mobile-v2/auth/login?email=${encodeURIComponent(email)}&verified=1&next=${encodeURIComponent(kycNext)}`);
      }, 1100);
    },
    [dispatch, email, router],
  );

  /** Single entry point for keypad taps, physical keys, paste and OS autofill. */
  const applyInput = useCallback(
    (next: string) => {
      if (status !== 'idle') return;
      const digits = next.replace(/\D/g, '').slice(0, CODE_LENGTH);
      setCode(digits);
      if (error && digits) setError(null);
      if (digits.length === CODE_LENGTH) void verify(digits);
    },
    [error, status, verify],
  );

  const press = (k: (typeof KEYS)[number]) => {
    if (!k) return;
    if (k === 'del') applyInput(code.slice(0, -1));
    else if (code.length < CODE_LENGTH) applyInput(code + k);
  };

  // Physical keyboard support (desktop, or a phone with a hardware keyboard).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement && e.target !== hiddenInputRef.current) return;
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        if (code.length < CODE_LENGTH) applyInput(code + e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        applyInput(code.slice(0, -1));
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text') ?? '';
      if (/\d{4,}/.test(text)) {
        e.preventDefault();
        applyInput(text);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('paste', onPaste);
    };
  }, [applyInput, code]);

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (/\d{6}/.test(text.replace(/\s/g, ''))) applyInput(text);
      else toast.message('No 6-digit code found on your clipboard.');
    } catch {
      toast.message('Paste is blocked here. Type the code instead.');
    }
  };

  const handleResend = async () => {
    if (!email || seconds > 0 || resending) return;
    setResending(true);
    // POST /api/v1/otp/resend { identifier, purpose } — tenant headers are attached by apiClient + the BFF.
    const res = await dispatch(resendOtpThunk({ identifier: email, purpose: 'verification' }));
    setResending(false);
    if (resendOtpThunk.rejected.match(res)) {
      dispatch(clearMobileClientAuthError());
      const msg = res.payload ?? 'Could not resend code.';
      // Rate-limited ("try again in 45 seconds")? Restart the countdown from the server's number.
      const wait = /(\d+)\s*(?:s\b|sec|second)/i.exec(msg)?.[1];
      if (wait) setSeconds(Math.min(Number(wait), 600));
      toast.error(msg);
      return;
    }
    setSeconds(RESEND_SECONDS);
    setCode('');
    setError(null);
    toast.success('A new code is on its way.');
  };

  if (!email) return null;

  return (
    <div className="flex h-full flex-col sf-page-bg text-[#1E293B]">
      {/* Header */}
      <div className="relative flex shrink-0 items-center justify-center px-4 pt-12">
        <Link
          href={backHref}
          aria-label="Back"
          className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-black/5"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="flex h-11 items-center text-[17px] font-semibold">Verify email</h1>
      </div>

      {/* Body */}
      <section className={cn(s.slideIn, 'flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 pt-4 no-scrollbar')}>
        <div className={cn(s.pop, 'mt-2 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[var(--sf-tint,#E0E7FF)]')}>
          <Mail className="h-[30px] w-[30px] text-[var(--sf-button,#1E40AF)]" strokeWidth={1.8} />
        </div>
        <h2 className="mt-4 text-center text-[26px] font-bold leading-tight tracking-tight text-[var(--sf-ink,#1E1B4B)]">
          Check your email
        </h2>
        <p className="mt-2 max-w-[310px] text-center text-[15px] leading-snug text-gray-500">
          We sent a 6-digit code to <span className="font-semibold text-gray-700">{email}</span>
        </p>

        {/* Code cells */}
        <div
          key={shakeKey}
          className={cn('mt-6 flex gap-2', shakeKey > 0 && s.shake)}
          role="group"
          aria-label={`Verification code, ${code.length} of ${CODE_LENGTH} digits entered`}
          onClick={() => hiddenInputRef.current?.focus({ preventScroll: true })}
        >
          {Array.from({ length: CODE_LENGTH }, (_, i) => {
            const ch = code[i] ?? '';
            const active = status === 'idle' && i === code.length;
            return (
              <div
                key={i}
                className={cn(
                  'flex h-14 w-12 items-center justify-center rounded-[14px] border-2 text-2xl font-bold tabular-nums text-[var(--sf-ink,#1E1B4B)] transition-[border-color,background-color] duration-200',
                  status === 'ok'
                    ? 'border-[#34C759] bg-[#EAFBEF]'
                    : active
                      ? 'border-[var(--sf-button,#1E40AF)] bg-white'
                      : ch
                        ? 'border-[color-mix(in_srgb,var(--sf-button,#1E40AF)_35%,white)] bg-white'
                        : error
                          ? 'border-red-200 bg-white'
                          : 'border-gray-200 bg-white',
                  status === 'checking' && s.pulse,
                )}
              >
                {ch}
              </div>
            );
          })}
        </div>

        {/* Hidden input: lets iOS/Android offer the code from Mail and supports paste. No native keyboard. */}
        <input
          ref={hiddenInputRef}
          type="text"
          inputMode="none"
          autoComplete="one-time-code"
          aria-hidden
          tabIndex={-1}
          value={code}
          onChange={(e) => applyInput(e.target.value)}
          className="pointer-events-none absolute h-px w-px opacity-0"
        />

        {/* Status line */}
        <div className="mt-2.5 flex min-h-11 items-center justify-center" aria-live="polite">
          {status === 'checking' ? (
            <span className="flex items-center gap-2.5 text-[15px] font-semibold text-[var(--sf-button,#1E40AF)]">
              <Loader2 className="h-5 w-5 animate-spin" /> Checking code
            </span>
          ) : status === 'ok' ? (
            <span className={cn(s.pop, 'flex items-center gap-2 text-base font-bold text-[#17743F]')}>
              <TickCircle /> Email verified
            </span>
          ) : error ? (
            <span className={cn(s.rise, 'max-w-[320px] text-center text-sm font-medium text-red-600')} role="alert">
              {error}
            </span>
          ) : (
            <span className="flex flex-wrap items-center justify-center gap-1 text-sm text-gray-500">
              {seconds > 0 ? (
                <span className="tabular-nums">Resend code in {formatCountdown(seconds)}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  disabled={resending}
                  className="min-h-11 px-1.5 text-[15px] font-semibold text-[var(--sf-primary,#2563EB)] disabled:opacity-60"
                >
                  {resending ? 'Sending…' : 'Resend code'}
                </button>
              )}
              <span aria-hidden>·</span>
              <Link href={backHref} className="flex min-h-11 items-center px-1.5 text-[15px] font-semibold text-[var(--sf-primary,#2563EB)]">
                Change email
              </Link>
            </span>
          )}
        </div>
        {error && status === 'idle' && seconds <= 0 && (
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={resending}
            className="min-h-11 text-[15px] font-semibold text-[var(--sf-primary,#2563EB)]"
          >
            {resending ? 'Sending…' : 'Send a new code'}
          </button>
        )}

        <div className="mt-auto pb-3 pt-4">
          {canPaste && status === 'idle' && code.length === 0 && (
            <button
              type="button"
              onClick={() => void pasteFromClipboard()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--sf-tint,#E0E7FF)] px-4 text-[15px] font-semibold text-[var(--sf-ink,#1E1B4B)]"
            >
              <ClipboardPaste className="h-[18px] w-[18px]" />
              Paste code
            </button>
          )}
        </div>
      </section>

      {/* Keypad */}
      <div className="shrink-0 border-t border-gray-200/80 bg-[#F4F2FC]/95 px-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((k, i) =>
            k === '' ? (
              <div key={i} />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => press(k)}
                disabled={status !== 'idle'}
                aria-label={k === 'del' ? 'Delete' : k}
                className={cn(
                  'flex h-[50px] w-full items-center justify-center rounded-xl text-2xl font-semibold text-[#1C1C1E] transition-[transform,background-color] duration-100 active:scale-[0.93] disabled:opacity-50',
                  k === 'del' ? 'bg-transparent' : 'bg-white shadow-[0_1px_0_rgba(60,50,130,0.16)] active:bg-[#E4E0F6]',
                )}
              >
                {k === 'del' ? <Delete className="h-6 w-6" strokeWidth={1.7} /> : k}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={<div className="flex h-full items-center justify-center sf-page-bg p-6 text-sm text-gray-500">Loading…</div>}
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
