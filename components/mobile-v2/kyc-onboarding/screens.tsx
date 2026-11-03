'use client';

/**
 * KYC onboarding screens — built to the "new kyc flow" prototype (Google Doc), wired to account-ms
 * `/api/v1/kyc/onboarding/*`. Screen order: Welcome → Contacts (phone, email) → BVN → NIN → Face →
 * Address (+ proof) → Finalising → Done.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, FileText, Mail, MapPin, ShieldCheck, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppDispatch } from '@/store/hooks';
import { clearMobileClientAuthError, generateOtpThunk, resendOtpThunk, verifyOtpThunk } from '@/store/mobileClientAuthSlice';
import {
  kycOnboarding,
  NIGERIAN_STATES,
  NIN_ADDRESS_KEY,
  OnboardingApiError,
  PHONE_OTP_ENABLED,
  pickFaceSession,
  pickNinAddress,
  pickVerifiedName,
  readFaceReference,
  storeFaceReference,
  uploadProofWithProgress,
  type OnboardingProgress,
} from '@/lib/kycOnboardingClient';
import {
  BRAND_GRADIENT,
  BrandTick,
  ErrorNote,
  kycMotion as s,
  PointsChip,
  PrimaryButton,
  StageRow,
  TickCircle,
} from './ui';
import { applyKey, CodeCells, Keypad } from './keypad';

type StepResult = { progress: OnboardingProgress; json: Record<string, unknown> };

const INPUT =
  'h-14 w-full rounded-[20px] border-0 bg-white px-[18px] text-base font-semibold text-[var(--sf-ink,#1E1B4B)] shadow-[0_2px_10px_rgba(60,50,130,0.07)] placeholder:font-semibold placeholder:text-[#8A90A6] focus:outline-none focus:ring-2 focus:ring-[var(--sf-primary,#2563EB)]/25 disabled:opacity-60';

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/* ───────────────────────────── Welcome ───────────────────────────── */

const WELCOME_ITEMS: { title: string; sub: string; time: string; done: (p: OnboardingProgress | null) => boolean }[] = [
  {
    title: 'Verify phone and email',
    sub: 'WhatsApp and email codes',
    time: '1 min',
    done: (p) => Boolean(p?.steps.phoneVerified && p?.steps.emailVerified),
  },
  { title: 'Confirm your identity', sub: 'BVN and NIN', time: '1 min', done: (p) => Boolean(p?.steps.bvnVerified && p?.steps.ninVerified) },
  { title: 'Quick face check', sub: 'A short selfie video', time: '30 sec', done: (p) => Boolean(p?.steps.faceVerified) },
  {
    title: 'Add your address',
    sub: 'With a proof of address',
    time: '30 sec',
    done: (p) => Boolean(p?.steps.addressVerified && p?.steps.proofUploaded),
  },
];

export function WelcomeScreen({
  justSignedUp,
  progress,
  starting,
  error,
  onStart,
  onLater,
}: {
  justSignedUp: boolean;
  progress: OnboardingProgress | null;
  starting: boolean;
  error: string | null;
  onStart: () => void;
  onLater: () => void;
}) {
  const resumed = Boolean(progress && WELCOME_ITEMS.some((i) => i.done(progress)));
  return (
    <section className={cn(s.slideIn, BRAND_GRADIENT, 'flex h-full flex-col items-center overflow-y-auto px-6 pb-10 pt-24 text-white no-scrollbar')}>
      <div className={cn(s.pop, 'flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_0_0_12px_rgba(255,255,255,0.14),0_16px_40px_rgba(10,6,40,0.35)]')}>
        <svg width="46" height="46" viewBox="0 0 24 24" aria-hidden>
          <path className={s.draw} d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="var(--sf-button,#1E40AF)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className={cn(s.rise, 'mt-[26px] text-center text-[30px] font-bold leading-[1.15] tracking-[-0.5px]')} style={{ animationDelay: '150ms' }}>
        {justSignedUp ? 'Account created' : resumed ? 'Welcome back' : 'Verify your account'}
      </h1>
      <p className={cn(s.rise, 'mt-2.5 max-w-[300px] text-center text-base leading-snug text-white/80')} style={{ animationDelay: '230ms' }}>
        {resumed
          ? 'Pick up where you left off. Each check unlocks more and earns you points.'
          : 'Four quick checks, about 3 minutes. Each one unlocks more and earns you points.'}
      </p>
      {progress && progress.points > 0 && (
        <PointsChip points={progress.points} className={cn(s.rise, 'mt-3')} />
      )}
      <ol className="mt-[30px] flex w-full flex-col gap-2.5">
        {WELCOME_ITEMS.map((item, i) => {
          const done = item.done(progress);
          return (
            <li
              key={item.title}
              className={cn(s.rise, 'flex items-center gap-3.5 rounded-[18px] bg-white/12 px-4 py-3')}
              style={{ animationDelay: `${300 + i * 100}ms` }}
            >
              {done ? (
                <TickCircle size={32} />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[15px] font-bold text-[var(--sf-ink,#1E1B4B)]">
                  {i + 1}
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-base font-semibold">{item.title}</span>
                <span className="text-[13px] text-white/75">{item.sub}</span>
              </span>
              <span className="text-[13px] font-semibold text-white/85">{done ? 'Done' : item.time}</span>
            </li>
          );
        })}
      </ol>
      {error && <p className="mt-4 w-full rounded-xl bg-white/95 px-3 py-2 text-sm text-red-800" role="alert">{error}</p>}
      <div className="mt-auto flex w-full flex-col items-center gap-0.5 pt-8">
        <PrimaryButton light loading={starting} onClick={onStart}>
          {starting ? 'Starting…' : resumed ? 'Continue verification' : 'Start verification'}
        </PrimaryButton>
        <button type="button" onClick={onLater} className="min-h-11 px-2 text-[15px] font-semibold text-white/85 hover:text-white">
          I&apos;ll do this later
        </button>
      </div>
    </section>
  );
}

/* ───────────────────────────── Contacts: phone + email ───────────────────────────── */

function WhatsAppIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z" fill="#25D366" />
      <path d="M8.6 8.4c.2-.4.5-.4.8-.4h.4c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c.8 1.4 1.7 2.1 2.9 2.7l.6-.7c.2-.2.4-.2.6-.1l1.6.8c.2.1.3.3.3.5 0 .8-.7 1.5-1.6 1.6-3 .2-6.1-3.1-5.2-6.6z" fill="#fff" />
    </svg>
  );
}

/** "+2348012345678" → "+234 801 234 5678"; local "08012345678" → "0801 234 5678". */
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (raw.trim().startsWith('+') && d.startsWith('234')) {
    const r = d.slice(3);
    return `+234 ${r.slice(0, 3)} ${r.slice(3, 6)} ${r.slice(6)}`.trim();
  }
  if (d.startsWith('0')) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`.trim();
  return (raw.trim().startsWith('+') ? '+' : '') + d;
}

function isValidNgPhone(raw: string): boolean {
  const d = raw.replace(/\D/g, '');
  return /^0\d{10}$/.test(d) || /^234\d{10}$/.test(d);
}

type ContactsPhase = 'phone' | 'phoneCode' | 'phoneOk' | 'email' | 'emailOk';

export function ContactsScreen({
  progress,
  initialPhone,
  email,
  onPhase,
  onProgress,
  onDone,
}: {
  progress: OnboardingProgress;
  initialPhone: string;
  email: string;
  /** Lets the page swap "Save & exit" for a back arrow on the first phone screen. */
  onPhase?: (phase: ContactsPhase) => void;
  /** Intermediate progress (phone saved) so the header updates before the step finishes. */
  onProgress: (r: StepResult) => void;
  onDone: (r: StepResult) => void;
}) {
  const dispatch = useAppDispatch();
  const phoneAlreadyDone = progress.steps.phoneVerified === true;
  const [phase, setPhase] = useState<ContactsPhase>(phoneAlreadyDone ? 'email' : 'phone');
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [resend, setResend] = useState(0);
  const lastResult = useRef<StepResult | null>(null);

  useEffect(() => onPhase?.(phase), [onPhase, phase]);
  useEffect(() => {
    if (initialPhone && !phone) setPhone(initialPhone);
  }, [initialPhone, phone]);
  useEffect(() => {
    if (resend <= 0) return;
    const t = setInterval(() => setResend((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [resend]);

  const finish = useCallback(
    (r: StepResult) => {
      setPhase('emailOk');
      setStatus('ok');
      setTimeout(() => onDone(r), 900);
    },
    [onDone],
  );

  /** Email step: already verified at signup → tick and move on; otherwise send a code. */
  useEffect(() => {
    if (phase !== 'email') return;
    if (progress.steps.emailVerified !== false) {
      const r = lastResult.current ?? { progress, json: {} };
      const t = setTimeout(() => finish(r), 700);
      return () => clearTimeout(t);
    }
    void dispatch(resendOtpThunk({ identifier: email, purpose: 'verification' })).then(() => setResend(30));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when the email phase starts
  }, [phase]);

  const savePhone = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await kycOnboarding.syncContacts(phone.replace(/[\s-]/g, ''));
      lastResult.current = r;
      onProgress(r);
      setPhase('phoneOk');
      setStatus('ok');
      setTimeout(() => {
        setStatus('idle');
        setCode('');
        setPhase('email');
      }, 1200);
    } catch (err) {
      setError(errorText(err, 'Could not save your phone number.'));
      setShakeKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  const sendPhoneCode = async () => {
    setBusy(true);
    setError(null);
    const res = await dispatch(
      generateOtpThunk({ identifier: phone.replace(/[\s-]/g, ''), channel: 'whatsapp', purpose: 'phone-verification' }),
    );
    setBusy(false);
    if (generateOtpThunk.rejected.match(res)) {
      dispatch(clearMobileClientAuthError());
      setError(res.payload ?? 'Could not send a WhatsApp code.');
      return;
    }
    setCode('');
    setResend(30);
    setPhase('phoneCode');
  };

  const checkCode = async (value: string) => {
    const identifier = phase === 'phoneCode' ? phone.replace(/[\s-]/g, '') : email;
    const purpose = phase === 'phoneCode' ? 'phone-verification' : 'verification';
    setStatus('checking');
    setError(null);
    try {
      await dispatch(verifyOtpThunk({ identifier, code: value, purpose })).unwrap();
    } catch (err) {
      dispatch(clearMobileClientAuthError());
      setStatus('idle');
      setCode('');
      setShakeKey((k) => k + 1);
      setError(typeof err === 'string' ? err : 'That code is wrong or has expired.');
      return;
    }
    if (phase === 'phoneCode') {
      await savePhone();
      return;
    }
    // Email verified in client-auth; contacts/sync pulls the flag into onboarding.
    try {
      const r = await kycOnboarding.syncContacts(phone.replace(/[\s-]/g, ''));
      finish(r);
    } catch (e) {
      setStatus('idle');
      setError(errorText(e, 'Email verified, but we could not update your progress. Try again.'));
    }
  };

  const onKey = (k: string) => {
    if (status !== 'idle') return;
    if (phase === 'phone') {
      setError(null);
      if (k === 'del') setPhone((p) => p.slice(0, -1));
      else if (phone.replace(/\D/g, '').length < 13) setPhone((p) => p + k);
      return;
    }
    if (phase === 'phoneCode' || phase === 'email') {
      const next = applyKey(code, k, 6);
      setCode(next);
      if (error && next) setError(null);
      if (next.length === 6) void checkCode(next);
    }
  };

  const onPaste = (text: string) => {
    if ((phase === 'phoneCode' || phase === 'email') && status === 'idle') {
      const d = text.replace(/\D/g, '').slice(0, 6);
      setCode(d);
      if (d.length === 6) void checkCode(d);
    }
  };

  const resendCode = async () => {
    if (resend > 0) return;
    if (phase === 'phoneCode') {
      await sendPhoneCode();
      return;
    }
    const res = await dispatch(resendOtpThunk({ identifier: email, purpose: 'verification' }));
    if (resendOtpThunk.rejected.match(res)) {
      dispatch(clearMobileClientAuthError());
      setError(res.payload ?? 'Could not resend the code.');
      return;
    }
    setResend(30);
  };

  const isPhone = phase === 'phone' || phase === 'phoneCode' || phase === 'phoneOk';
  const showCells =
    phase === 'phoneCode' ||
    (phase === 'email' && progress.steps.emailVerified === false) ||
    (phase === 'emailOk' && code.length === 6);
  const phoneValid = isValidNgPhone(phone);

  const title =
    phase === 'phone'
      ? 'Confirm your WhatsApp number'
      : phase === 'phoneCode'
        ? 'Check your WhatsApp'
        : phase === 'phoneOk'
          ? 'Phone verified'
          : progress.steps.emailVerified === false && phase === 'email'
            ? 'Now check your email'
            : 'Email verified';

  const sub =
    phase === 'phone'
      ? 'Use the number linked to your BVN. We use it to match your identity.'
      : phase === 'phoneCode'
        ? `We sent a 6-digit code to ${formatPhone(phone)}`
        : phase === 'phoneOk'
          ? formatPhone(phone)
          : progress.steps.emailVerified === false && phase === 'email'
            ? `We sent a 6-digit code to ${email}`
            : `${email || 'Your email'} was confirmed when you signed up.`;

  return (
    <>
      <section className={cn(s.slideIn, 'flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 pt-2 no-scrollbar')} key={isPhone ? 'phone' : 'email'}>
        <div
          className={cn(
            s.pop,
            'mt-2 flex h-16 w-16 items-center justify-center rounded-[20px]',
            isPhone ? 'bg-[#E7FAEE]' : 'bg-[var(--sf-tint,#E0E7FF)]',
          )}
        >
          {isPhone ? <WhatsAppIcon /> : <Mail className="h-[30px] w-[30px] text-[var(--sf-button,#1E40AF)]" strokeWidth={1.8} />}
        </div>
        <h1 className="mt-4 text-center text-[26px] font-bold leading-tight tracking-[-0.4px] text-[var(--sf-ink,#1E1B4B)]">{title}</h1>
        <p className="mt-2 max-w-[310px] text-center text-[15px] leading-snug text-gray-500">{sub}</p>

        {phase === 'phone' && (
          <div key={shakeKey} className={cn('mt-[22px] w-full', shakeKey > 0 && s.shake)}>
            <div className="flex h-[68px] items-center justify-center whitespace-pre rounded-[20px] bg-white px-5 text-[26px] font-bold tracking-[1px] tabular-nums text-[var(--sf-ink,#1E1B4B)] shadow-[0_2px_10px_rgba(60,50,130,0.07)]">
              {phone ? formatPhone(phone) : <span className="text-gray-300">0801 234 5678</span>}
              <span className={cn(s.caret, 'mx-0.5 inline-block h-[30px] w-0.5 bg-[var(--sf-button,#1E40AF)]')} />
            </div>
          </div>
        )}

        {showCells && (
          <div className="mt-[22px]">
            <CodeCells value={code} status={phase === 'emailOk' ? 'ok' : status} error={Boolean(error)} shakeKey={shakeKey} />
          </div>
        )}

        <div className="mt-2.5 flex min-h-11 items-center justify-center" aria-live="polite">
          {status === 'checking' || busy ? (
            <span className="flex items-center gap-2.5 text-[15px] font-semibold text-[var(--sf-button,#1E40AF)]">
              <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-[var(--sf-tint,#E0E7FF)] border-t-[var(--sf-button,#1E40AF)]" />
              {busy ? 'Saving' : 'Checking code'}
            </span>
          ) : phase === 'phoneOk' || phase === 'emailOk' || (phase === 'email' && progress.steps.emailVerified !== false) ? (
            <span className={cn(s.pop, 'flex items-center gap-2 text-base font-bold text-[#17743F]')}>
              <TickCircle /> {isPhone ? 'Phone verified' : 'Email verified'}
            </span>
          ) : error ? (
            <span className={cn(s.rise, 'max-w-[320px] text-center text-sm font-medium text-red-600')} role="alert">
              {error}
            </span>
          ) : phase === 'phoneCode' || phase === 'email' ? (
            <span className="flex items-center gap-1 text-sm text-gray-500">
              {resend > 0 ? (
                <span className="tabular-nums">Resend code in 0:{String(resend).padStart(2, '0')}</span>
              ) : (
                <button type="button" onClick={() => void resendCode()} className="min-h-11 px-1.5 text-[15px] font-semibold text-[var(--sf-primary,#2563EB)]">
                  Resend code
                </button>
              )}
              {phase === 'phoneCode' && (
                <>
                  <span aria-hidden>·</span>
                  <button type="button" onClick={() => setPhase('phone')} className="min-h-11 px-1.5 text-[15px] font-semibold text-[var(--sf-primary,#2563EB)]">
                    Change number
                  </button>
                </>
              )}
            </span>
          ) : null}
        </div>

        {phase === 'phone' && (
          <div className="mt-auto w-full pb-3 pt-4">
            <PrimaryButton
              disabled={!phoneValid}
              loading={busy}
              onClick={() => void (PHONE_OTP_ENABLED ? sendPhoneCode() : savePhone())}
            >
              {PHONE_OTP_ENABLED ? 'Send WhatsApp code' : 'Confirm number'}
            </PrimaryButton>
          </div>
        )}
      </section>
      {(phase === 'phone' || phase === 'phoneCode' || (phase === 'email' && progress.steps.emailVerified === false)) && (
        <Keypad onKey={onKey} onPaste={onPaste} disabled={status !== 'idle' || busy} />
      )}
    </>
  );
}

/* ───────────────────────────── BVN / NIN ───────────────────────────── */

const ID_COPY = {
  bvn: {
    title: 'Confirm your BVN',
    sub: 'We only read your name, date of birth and photo. We can never see your money or move it.',
    help: "Don't know your BVN? Dial *565*0# on the phone number linked to your bank.",
    checking: ['Contacting NIBSS', 'Matching your phone number', 'Fetching your name and photo'],
    done: 'BVN confirmed',
    rows: ['Phone number matches your WhatsApp number', 'Date of birth on file', 'Photo on file for your face check'],
    cta: 'Verify BVN',
    next: 'Looks right, continue',
  },
  nin: {
    title: 'Now your NIN',
    sub: 'Your National Identification Number lets us cross-check the details from your BVN.',
    help: "Don't know your NIN? Dial *346# on your phone, or check your NIN slip.",
    checking: ['Contacting NIMC', 'Comparing with your BVN record', 'Checking your date of birth'],
    done: 'NIN confirmed',
    rows: ['Name matches your BVN', 'Date of birth matches your BVN', 'Address found on your NIN'],
    cta: 'Verify NIN',
    next: 'Continue',
  },
} as const;

function formatId(buf: string): { typed: string; rest: string } {
  let typed = '';
  let rest = '';
  for (let i = 0; i < 11; i++) {
    const sep = i === 4 || i === 8 ? ' ' : '';
    if (i < buf.length) typed += sep + buf[i];
    else rest += sep + '•';
  }
  return { typed, rest };
}

export function IdentityScreen({
  kind,
  onProgress,
  onDone,
}: {
  kind: 'bvn' | 'nin';
  onProgress: (r: StepResult) => void;
  onDone: (r: StepResult) => void;
}) {
  const copy = ID_COPY[kind];
  const [value, setValue] = useState('');
  const [stage, setStage] = useState(0); // 0 input · 1-3 checking · 4 result
  const [result, setResult] = useState<StepResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const verify = async () => {
    if (value.length !== 11 || stage !== 0) return;
    setError(null);
    setStage(1);
    const t1 = setTimeout(() => setStage((v) => (v === 1 ? 2 : v)), 800);
    const t2 = setTimeout(() => setStage((v) => (v === 2 ? 3 : v)), 1600);
    try {
      const r = kind === 'bvn' ? await kycOnboarding.verifyBvn(value) : await kycOnboarding.verifyNin(value);
      clearTimeout(t1);
      clearTimeout(t2);
      if (kind === 'nin') {
        const addr = pickNinAddress(r.json);
        try {
          if (addr) sessionStorage.setItem(NIN_ADDRESS_KEY, JSON.stringify(addr));
        } catch {
          /* storage unavailable */
        }
      }
      setStage(3);
      setResult(r);
      setTimeout(() => {
        setStage(4);
        onProgress(r);
      }, 450);
    } catch (err) {
      clearTimeout(t1);
      clearTimeout(t2);
      setStage(0);
      setError(errorText(err, `Could not verify your ${kind.toUpperCase()}.`));
      setShakeKey((k) => k + 1);
    }
  };

  const onKey = (k: string) => {
    if (stage !== 0) return;
    setError(null);
    setValue((v) => applyKey(v, k, 11));
  };

  const { typed, rest } = formatId(value);
  const name = result ? pickVerifiedName(result.json) : null;

  return (
    <>
      <section className={cn(s.slideIn, 'flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-2 no-scrollbar')}>
        <div className={cn(s.pop, 'mt-1.5 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--sf-tint,#E0E7FF)]')}>
          <ShieldCheck className="h-7 w-7 text-[var(--sf-button,#1E40AF)]" strokeWidth={1.8} />
        </div>
        <h1 className="mt-3.5 text-[26px] font-bold leading-tight tracking-[-0.4px] text-[var(--sf-ink,#1E1B4B)]">{copy.title}</h1>
        <p className="mt-1.5 text-[15px] leading-snug text-gray-500">{copy.sub}</p>

        {stage === 0 && (
          <div key={shakeKey} className={shakeKey ? s.shake : undefined}>
            <div
              className="mt-[18px] flex h-[68px] items-center whitespace-pre rounded-[20px] bg-white px-5 text-[28px] font-bold tracking-[2px] tabular-nums shadow-[0_2px_10px_rgba(60,50,130,0.07)]"
              aria-label={`${kind.toUpperCase()}: ${value.length} of 11 digits`}
            >
              <span className="text-[var(--sf-ink,#1E1B4B)]">{typed}</span>
              <span className={cn(s.caret, 'mx-0.5 inline-block h-[30px] w-0.5 bg-[var(--sf-button,#1E40AF)]')} />
              <span className="text-[#CFCBE3]">{rest}</span>
            </div>
            <p className="mt-3 text-sm leading-snug text-gray-500">{copy.help}</p>
          </div>
        )}

        {stage >= 1 && stage <= 3 && (
          <div className={cn(s.rise, 'mt-[18px] rounded-[20px] bg-white px-[18px] py-2 shadow-[0_2px_10px_rgba(60,50,130,0.07)]')} aria-live="polite">
            {copy.checking.map((label, i) => (
              <StageRow key={label} label={label} state={stage > i + 1 ? 'done' : stage === i + 1 ? 'active' : 'wait'} />
            ))}
          </div>
        )}

        {stage >= 4 && (
          <div className={cn(s.pop, 'mt-4 rounded-[20px] bg-white px-[18px] py-4 shadow-[0_2px_10px_rgba(60,50,130,0.07)]')}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EAFBEF]">
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
                  <path className={s.draw} d="M5.5 12.5l4.2 4.2L18.5 8" fill="none" stroke="#17743F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="flex flex-col">
                <span className="text-[13px] font-semibold text-[#17743F]">{copy.done}</span>
                <span className="text-[19px] font-bold text-[#1C1C1E]">{name ?? `•••• ${value.slice(-4)}`}</span>
              </span>
            </div>
            <div className="mb-1 mt-3.5 h-px bg-[#EEEDF6]" />
            {copy.rows.map((row) => (
              <div key={row} className="flex min-h-[38px] items-center gap-2.5 text-[15px] text-[#3F4457]">
                <BrandTick size={18} />
                {row}
              </div>
            ))}
          </div>
        )}

        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>

        <div className="mt-auto pb-3 pt-4">
          {stage === 0 && (
            <PrimaryButton disabled={value.length !== 11} onClick={() => void verify()}>
              {copy.cta}
            </PrimaryButton>
          )}
          {stage >= 4 && result && (
            <PrimaryButton autoFocus onClick={() => onDone(result)}>
              {copy.next}
            </PrimaryButton>
          )}
        </div>
      </section>
      <Keypad onKey={onKey} onPaste={(t) => stage === 0 && setValue(t.replace(/\D/g, '').slice(0, 11))} disabled={stage !== 0} />
    </>
  );
}

/* ───────────────────────────── Face ───────────────────────────── */

const FACE_TIPS = ['Face a window or a bright light', 'Take off glasses, cap or mask', 'Hold your phone at eye level'];

function FaceRing({ phase }: { phase: 'checking' | 'ok' }) {
  return (
    <div className="relative mx-auto mt-2.5 h-[264px] w-[264px]">
      <svg width="264" height="264" viewBox="0 0 264 264" aria-hidden className="absolute inset-0">
        <circle cx="132" cy="132" r="124" fill="none" stroke="#E3E1F2" strokeWidth="6" />
        <circle
          cx="132"
          cy="132"
          r="124"
          fill="none"
          stroke={phase === 'ok' ? '#34C759' : 'var(--sf-button,#1E40AF)'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="779.1"
          transform="rotate(-90 132 132)"
          style={{ strokeDashoffset: phase === 'ok' ? 0 : 156, transition: 'stroke-dashoffset 1.5s linear, stroke .3s ease' }}
        />
      </svg>
      <div className="absolute left-4 top-4 h-[232px] w-[232px] overflow-hidden rounded-full bg-[linear-gradient(180deg,#1E1B3A,var(--sf-ink,#1E1B4B))]">
        <svg width="232" height="232" viewBox="0 0 232 232" aria-hidden className="absolute inset-0">
          <path d="M28 232 C28 172 70 150 116 150 C162 150 204 172 204 232 Z" fill="rgba(255,255,255,.16)" />
          <circle cx="116" cy="98" r="46" fill="rgba(255,255,255,.2)" />
          <ellipse cx="116" cy="102" rx="62" ry="78" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="2" strokeDasharray="4 7" />
        </svg>
        {phase === 'checking' ? (
          <div
            className={cn(s.scanLine, 'absolute inset-x-0 top-[114px] h-1')}
            style={{
              background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--sf-primary,#2563EB) 60%, white), transparent)',
              boxShadow: '0 0 16px 4px color-mix(in srgb, var(--sf-primary,#2563EB) 60%, transparent)',
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(52,199,89,0.35)]">
            <div className={cn(s.pop, 'flex h-[84px] w-[84px] items-center justify-center rounded-full bg-[#34C759]')}>
              <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden>
                <path className={s.draw} d="M5.5 12.5l4.2 4.2L18.5 8" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function FaceScreen({ onDone }: { onDone: (r: StepResult) => void }) {
  type Phase = 'intro' | 'starting' | 'checking' | 'ok' | 'failed';
  const [phase, setPhase] = useState<Phase>(() => (readFaceReference() ? 'checking' : 'intro'));
  const [error, setError] = useState<string | null>(null);

  const finishCheck = async (reference: string | null) => {
    setPhase('checking');
    setError(null);
    try {
      const r = await kycOnboarding.completeFace(reference && reference !== 'pending' ? reference : null);
      if (r.progress.steps.faceVerified || r.progress.currentStep !== 'face') {
        storeFaceReference(null);
        setPhase('ok');
        setTimeout(() => onDone(r), 1400);
      } else {
        setPhase('failed');
        setError("We couldn't confirm your face check yet. If you finished it, try checking again in a moment.");
      }
    } catch (err) {
      setPhase('failed');
      setError(errorText(err, 'Face check could not be confirmed.'));
    }
  };

  // Back from the hosted liveness page: confirm the stored session.
  useEffect(() => {
    const ref = readFaceReference();
    if (ref) void finishCheck(ref);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const start = async () => {
    setPhase('starting');
    setError(null);
    try {
      const r = await kycOnboarding.startFace();
      if (r.progress.steps.faceVerified) {
        onDone(r);
        return;
      }
      const { url, reference } = pickFaceSession(r.json);
      if (url) {
        storeFaceReference(reference ?? 'pending');
        window.location.assign(url);
        return;
      }
      await finishCheck(reference);
    } catch (err) {
      setPhase('intro');
      setError(errorText(err, 'Could not start the face check.'));
    }
  };

  if (phase === 'checking' || phase === 'ok') {
    return (
      <section className={cn(s.slideIn, 'flex min-h-0 flex-1 flex-col items-center px-6 pb-10')}>
        <FaceRing phase={phase} />
        <div className="mt-[22px] h-[84px] text-center" aria-live="polite">
          {phase === 'checking' ? (
            <div className={s.rise}>
              <div className="text-2xl font-bold text-[var(--sf-ink,#1E1B4B)]">Matching your BVN photo</div>
              <div className="mt-1.5 text-[15px] text-gray-500">Hold still for a moment</div>
            </div>
          ) : (
            <div className={s.rise}>
              <div className="text-2xl font-bold text-[#17743F]">Face matched</div>
              <div className="mt-1.5 text-[15px] text-gray-500">It&apos;s you. Nicely done.</div>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={cn(s.slideIn, 'flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-10 pt-1.5 no-scrollbar')}>
      <h1 className="text-[26px] font-bold leading-tight tracking-[-0.4px] text-[var(--sf-ink,#1E1B4B)]">Quick face check</h1>
      <p className="mt-1.5 text-[15px] leading-snug text-gray-500">
        A short selfie video proves it&apos;s really you. We compare it with the photo on your BVN, then delete the video.
      </p>
      <div className={cn(s.pop, 'mx-auto mt-[22px] h-[200px] w-[200px]')}>
        <svg width="200" height="200" viewBox="0 0 200 200" aria-hidden>
          <circle cx="100" cy="100" r="86" fill="var(--sf-tint,#E0E7FF)" />
          <circle cx="100" cy="86" r="30" fill="color-mix(in srgb, var(--sf-primary,#2563EB) 35%, white)" />
          <path d="M44 168 C44 128 70 116 100 116 C130 116 156 128 156 168 Z" fill="color-mix(in srgb, var(--sf-primary,#2563EB) 35%, white)" />
          <path
            d="M22 54 V28 Q22 22 28 22 H54 M146 22 H172 Q178 22 178 28 V54 M178 146 V172 Q178 178 172 178 H146 M54 178 H28 Q22 178 22 172 V146"
            fill="none"
            stroke="var(--sf-button,#1E40AF)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <ul className="mt-5 flex flex-col gap-0.5">
        {FACE_TIPS.map((tip) => (
          <li key={tip} className="flex min-h-11 items-center gap-3 text-base text-[#3F4457]">
            <BrandTick />
            {tip}
          </li>
        ))}
      </ul>

      <div className="mt-3">
        <ErrorNote>{error}</ErrorNote>
      </div>

      <div className="mt-auto flex flex-col gap-1 pt-6">
        {phase === 'failed' ? (
          <>
            <PrimaryButton onClick={() => void finishCheck(readFaceReference())}>Check again</PrimaryButton>
            <button
              type="button"
              onClick={() => {
                storeFaceReference(null);
                void start();
              }}
              className="min-h-11 text-[15px] font-semibold text-[var(--sf-primary,#2563EB)]"
            >
              Restart face check
            </button>
          </>
        ) : (
          <PrimaryButton loading={phase === 'starting'} onClick={() => void start()}>
            {phase === 'starting' ? 'Opening camera…' : 'Start face check'}
          </PrimaryButton>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────────── Address ───────────────────────────── */

export type AddressSubmission = { street: string; lga: string; state: string } | { useNinAddress: true };

const MAX_PROOF_BYTES = 10 * 1024 * 1024;

function readNinAddress(): { street: string; lga: string; state: string } | null {
  try {
    const raw = sessionStorage.getItem(NIN_ADDRESS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AddressScreen({
  progress,
  error,
  onProgress,
  onSubmit,
}: {
  progress: OnboardingProgress;
  error: string | null;
  onProgress: (r: StepResult) => void;
  onSubmit: (input: AddressSubmission) => void;
}) {
  const [useNin, setUseNin] = useState(false);
  const [street, setStreet] = useState('');
  const [lga, setLga] = useState('');
  const [state, setState] = useState('');
  const [bill, setBill] = useState<'none' | 'uploading' | 'done'>(progress.steps.proofUploaded ? 'done' : 'none');
  const [billName, setBillName] = useState('Proof of address');
  const [billPct, setBillPct] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addressSaved = progress.steps.addressVerified === true;
  const filled = addressSaved || useNin || Boolean(street.trim() && lga.trim() && state);

  /** Prototype: the chip fills the fields from the NIN record. Without NIN data we let the server fill it. */
  const prefill = () => {
    const nin = readNinAddress();
    if (nin) {
      setUseNin(false);
      setStreet(nin.street);
      setLga(nin.lga);
      const match = NIGERIAN_STATES.find((s2) => nin.state.toLowerCase().includes(s2.toLowerCase()));
      setState(match ?? '');
    } else {
      setUseNin((v) => !v);
    }
  };

  const pickFile = async (f: File | undefined) => {
    setFileError(null);
    if (!f) return;
    if (!/^(application\/pdf|image\/)/.test(f.type)) {
      setFileError('Upload a PDF or a photo (JPG, PNG).');
      return;
    }
    if (f.size > MAX_PROOF_BYTES) {
      setFileError('That file is over 10 MB. Try a smaller scan or photo.');
      return;
    }
    setBillName(f.name);
    setBillPct(0);
    setBill('uploading');
    try {
      const p = await uploadProofWithProgress(f, setBillPct);
      setBill('done');
      onProgress({ progress: p, json: {} });
    } catch (err) {
      setBill('none');
      setFileError(err instanceof OnboardingApiError ? err.message : 'Upload failed. Try again.');
    }
  };

  return (
    <section className={cn(s.slideIn, 'flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-9 pt-1.5 no-scrollbar')}>
      <h1 className="text-[26px] font-bold leading-tight tracking-[-0.4px] text-[var(--sf-ink,#1E1B4B)]">Where do you live?</h1>
      <p className="mt-1.5 text-[15px] leading-snug text-gray-500">The last step. We use it to confirm where you live.</p>

      {addressSaved ? (
        <div className="mt-3.5 flex items-center gap-3 rounded-[20px] bg-white px-4 py-3 shadow-[0_2px_10px_rgba(60,50,130,0.07)]">
          <TickCircle />
          <span className="text-[15px] font-semibold text-[#1C1C1E]">Address saved</span>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={prefill}
            aria-pressed={useNin}
            className={cn(
              'mt-3.5 inline-flex min-h-11 items-center gap-2 self-start rounded-full px-4 text-[15px] font-semibold transition-colors',
              useNin ? 'bg-[var(--sf-button,#1E40AF)] text-white' : 'bg-[var(--sf-tint,#E0E7FF)] text-[var(--sf-ink,#1E1B4B)]',
            )}
          >
            <MapPin className="h-[18px] w-[18px]" />
            Use the address on my NIN
          </button>

          <div className="mt-3.5 flex flex-col gap-2.5">
            {useNin && <p className={cn(s.rise, 'text-sm text-gray-500')}>We&apos;ll use the address registered on your NIN.</p>}
            <label className="sr-only" htmlFor="kyc-street">House number and street</label>
            <input id="kyc-street" disabled={useNin} className={INPUT} placeholder="House number and street" autoComplete="street-address" value={street} onChange={(e) => setStreet(e.target.value)} />
            <label className="sr-only" htmlFor="kyc-lga">Area or LGA</label>
            <input id="kyc-lga" disabled={useNin} className={INPUT} placeholder="Area or LGA" autoComplete="address-level3" value={lga} onChange={(e) => setLga(e.target.value)} />
            <div className="relative">
              <label className="sr-only" htmlFor="kyc-state">State</label>
              <select
                id="kyc-state"
                disabled={useNin}
                className={cn(INPUT, 'appearance-none pr-11', !state && 'text-[#8A90A6]')}
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="">State</option>
                {NIGERIAN_STATES.map((st) => (
                  <option key={st} value={st} className="text-[#1E293B]">
                    {st === 'FCT' ? 'FCT Abuja' : st}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-[18px] top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA0B2]" />
            </div>
          </div>
        </>
      )}

      <div className="mt-3.5 rounded-[20px] bg-white px-4 py-3.5 shadow-[0_2px_10px_rgba(60,50,130,0.07)]">
        {bill === 'none' && (
          <div className="flex items-center gap-3">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-base font-semibold text-[#1C1C1E]">Proof of address</span>
              <span className="text-[13px] text-gray-500">Utility bill or tenancy agreement</span>
            </span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[var(--sf-tint,#E0E7FF)] px-4 text-[15px] font-semibold text-[var(--sf-ink,#1E1B4B)]"
            >
              <Upload className="h-4 w-4" />
              Upload
            </button>
          </div>
        )}
        {bill === 'uploading' && (
          <div className="flex flex-col gap-2.5" aria-live="polite">
            <div className="flex justify-between gap-3 text-[15px] font-semibold text-[#1C1C1E]">
              <span className="flex min-w-0 items-center gap-2 truncate">
                <FileText className="h-4 w-4 shrink-0 text-[var(--sf-button,#1E40AF)]" />
                <span className="truncate">{billName}</span>
              </span>
              <span className="tabular-nums text-gray-500">{Math.round(billPct * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#E3E1F2]">
              <div className="h-2 rounded-full bg-[var(--sf-button,#1E40AF)] transition-[width] duration-150 ease-linear" style={{ width: `${Math.round(billPct * 100)}%` }} />
            </div>
          </div>
        )}
        {bill === 'done' && (
          <div className={cn(s.pop, 'flex items-center gap-3')}>
            <TickCircle size={26} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-base font-semibold text-[#1C1C1E]">{billName}</span>
              <span className="text-[13px] text-[#17743F]">Uploaded</span>
            </span>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => {
            void pickFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      <div className="mt-3 space-y-2">
        <ErrorNote>{fileError}</ErrorNote>
        <ErrorNote>{error}</ErrorNote>
      </div>

      <div className="mt-auto pt-6">
        <PrimaryButton
          disabled={!(filled && bill === 'done')}
          onClick={() => onSubmit(useNin ? { useNinAddress: true } : { street: street.trim(), lga: lga.trim(), state })}
        >
          Finish verification
        </PrimaryButton>
      </div>
    </section>
  );
}

/* ───────────────────────────── Finalising / Done ───────────────────────────── */

const FINAL_STAGES = ['Saving your address', 'Running final checks', 'Unlocking Level 3'];

export function FinalisingScreen({ stage }: { stage: number }) {
  return (
    <section className={cn(s.slideIn, BRAND_GRADIENT, 'flex h-full flex-col items-center justify-center px-8 text-white')}>
      <svg className="animate-spin" width="72" height="72" viewBox="0 0 24 24" aria-hidden style={{ animationDuration: '1.1s' }}>
        <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="2.4" />
        <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <h1 className="mt-6 text-center text-[26px] font-bold">Finalising your account</h1>
      <div className="mt-[22px] flex w-full flex-col gap-1.5" aria-live="polite">
        {FINAL_STAGES.map((label, i) => (
          <StageRow key={label} dark label={label} state={stage > i ? 'done' : stage === i ? 'active' : 'wait'} />
        ))}
      </div>
    </section>
  );
}

function ScanFaceIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3a9 9 0 1 0 0.01 0 M9 10v1 M15 10v1 M8.5 15c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8" />
    </svg>
  );
}

const DONE_ICONS = [
  { label: 'Contacts', icon: Mail },
  { label: 'Identity', icon: ShieldCheck },
  { label: 'Face', icon: ScanFaceIcon },
  { label: 'Address', icon: MapPin },
];

const UNLOCKED = ['Fund your wallet and send money', 'Apply for loans, mortgages and more', 'Higher transaction limits'];

export function DoneScreen({ points, onHome }: { points: number; onHome: () => void }) {
  return (
    <section className={cn(s.slideIn, BRAND_GRADIENT, 'flex h-full flex-col items-center overflow-y-auto overflow-x-hidden px-6 pb-9 pt-[84px] text-white no-scrollbar')}>
      <div className="relative flex h-[132px] w-[132px] shrink-0 items-center justify-center">
        <div
          className={cn(s.rays, 'absolute -left-[34px] -top-[34px] h-[200px] w-[200px] rounded-full')}
          style={{
            background: 'repeating-conic-gradient(rgba(255,255,255,.2) 0deg 10deg, transparent 10deg 22deg)',
            WebkitMaskImage: 'radial-gradient(circle, #000 28%, transparent 68%)',
            maskImage: 'radial-gradient(circle, #000 28%, transparent 68%)',
          }}
        />
        <div className={cn(s.pop, 'relative flex h-[104px] w-[104px] items-center justify-center rounded-full bg-white shadow-[0_14px_36px_rgba(10,6,40,0.4)]')}>
          <svg width="56" height="56" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2.8l8 3v5.6c0 5-3.4 8.4-8 9.8-4.6-1.4-8-4.8-8-9.8V5.8z" fill="var(--sf-button,#1E40AF)" />
            <path className={s.draw} style={{ animationDelay: '.5s' }} d="M8.2 12l2.7 2.7 5-5.2" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <h1 className={cn(s.rise, 'mt-[22px] text-center text-[30px] font-bold leading-[1.15] tracking-[-0.5px]')} style={{ animationDelay: '250ms' }}>
        You&apos;re fully verified
      </h1>
      <div className={cn(s.rise, 'mt-3 flex items-center gap-2.5')} style={{ animationDelay: '330ms' }}>
        <span className="flex h-8 items-center rounded-full bg-white/18 px-3.5 text-sm font-bold">Level 3 · Fully verified</span>
        <PointsChip points={points} className="h-8 text-[15px]" />
      </div>
      <div className="mt-[26px] flex items-start gap-3.5">
        {DONE_ICONS.map(({ label, icon: Icon }, i) => (
          <div key={label} className={cn(s.pop, 'flex w-[68px] flex-col items-center gap-2')} style={{ animationDelay: `${450 + i * 110}ms` }}>
            <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/50 bg-white/16">
              <Icon className="h-[26px] w-[26px]" />
            </span>
            <span className="text-xs font-semibold text-white/85">{label}</span>
          </div>
        ))}
      </div>
      <div className={cn(s.rise, 'mt-[26px] w-full rounded-[20px] bg-white/12 px-[18px] py-1.5')} style={{ animationDelay: '900ms' }}>
        <div className="pb-0.5 pt-2.5 text-xs font-bold tracking-[1.2px] text-white/75">NOW UNLOCKED</div>
        {UNLOCKED.map((u) => (
          <div key={u} className="flex min-h-10 items-center gap-3 text-[15px] font-medium">
            <TickCircle size={20} />
            {u}
          </div>
        ))}
      </div>
      <div className="mt-auto w-full pt-8">
        <PrimaryButton light onClick={onHome}>
          Go to home
        </PrimaryButton>
      </div>
    </section>
  );
}
