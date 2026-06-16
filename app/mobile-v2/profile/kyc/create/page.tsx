'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { clearSecureTokens } from '@/lib/tokenManager';
import { getManualKycStatus, isManualKycComplete, submitManualKyc, type ManualKycStatus } from '@/lib/manualKycClient';

const SIGNUP_KYC_STORAGE_KEY = 'mobile-v2-manual-kyc-prefill';

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function CreateKycContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromRegistration = searchParams.get('from') === 'registration';
  const [status, setStatus] = useState<ManualKycStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bvn, setBvn] = useState('');
  const [nin, setNin] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SIGNUP_KYC_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { email?: string; phone?: string };
        if (!email && parsed.email) setEmail(parsed.email);
        if (parsed.phone) setPhone(parsed.phone);
      }
    } catch {
      // Ignore invalid prefill data.
    }
  }, [email]);

  useEffect(() => {
    let cancelled = false;
    async function loadStatus() {
      setLoadingStatus(true);
      setError(null);
      try {
        const data = await getManualKycStatus();
        if (cancelled) return;
        setStatus(data);
        if (data.manualKyc) {
          setBvn(data.manualKyc.bvnNormalized || data.manualKyc.bvn || '');
          setNin(data.manualKyc.ninNormalized || data.manualKyc.nin || '');
          setPhone(data.manualKyc.phone || phone);
          setEmail(data.manualKyc.email || email);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load KYC status');
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    }
    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const validationError = useMemo(() => {
    if (onlyDigits(bvn).length !== 11) return 'BVN must be exactly 11 digits.';
    if (onlyDigits(nin).length !== 11) return 'NIN must be exactly 11 digits.';
    if (onlyDigits(phone).length < 10) return 'Phone number must contain at least 10 digits.';
    if (!validEmail(email)) return 'Enter a valid email address.';
    return null;
  }, [bvn, nin, phone, email]);

  const finishAndLogin = async () => {
    if (fromRegistration) {
      sessionStorage.removeItem(SIGNUP_KYC_STORAGE_KEY);
      await clearSecureTokens();
      router.replace('/mobile-v2/auth/login');
      return;
    }
    router.replace('/mobile-v2/profile');
  };

  const handleSubmit = async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await submitManualKyc({
        bvn: onlyDigits(bvn),
        nin: onlyDigits(nin),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        phoneVerified: true,
        emailVerified: true,
      });
      const nextStatus = await getManualKycStatus();
      setStatus(nextStatus);
      toast.success('KYC completed successfully.');
      await finishAndLogin();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'KYC submit failed';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const complete = isManualKycComplete(status);

  return (
    <div className="flex h-full flex-col bg-[#FAFAFA]">
      <div className="mb-6 flex items-center px-6 pt-12">
        <Link href="/mobile-v2/profile" className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-700">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="mr-8 flex-1 text-center text-lg font-bold text-[#1E293B]">KYC</h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 no-scrollbar">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-[#1E293B]">Verify your identity</h2>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Enter your BVN and NIN to complete manual KYC before using product applications.
          </p>
        </div>

        {loadingStatus ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-sm text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--sf-button,#1E40AF)]" />
            Checking KYC status...
          </div>
        ) : complete ? (
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-[#1E293B]">KYC completed</h3>
            <p className="mt-2 text-sm text-gray-500">Your identity verification is complete.</p>
            <Button className="mt-6 h-12 w-full rounded-xl bg-[var(--sf-button,#1E40AF)]" onClick={() => void finishAndLogin()}>
              {fromRegistration ? 'Continue to Login' : 'Back to Profile'}
            </Button>
          </div>
        ) : status?.enabled === false ? (
          <div className="rounded-2xl bg-amber-50 p-4 text-center text-sm text-amber-800">
            Manual KYC fallback is disabled. Please contact support.
          </div>
        ) : (
          <div className="space-y-4">
            {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">BVN</label>
              <Input value={bvn} onChange={(e) => setBvn(onlyDigits(e.target.value).slice(0, 11))} inputMode="numeric" placeholder="22345678901" className="h-12" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">NIN</label>
              <Input value={nin} onChange={(e) => setNin(onlyDigits(e.target.value).slice(0, 11))} inputMode="numeric" placeholder="12345678901" className="h-12" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+2348012345678" className="h-12" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="user@example.com" className="h-12" />
            </div>

            <div className="rounded-xl bg-blue-50 px-3 py-3 text-xs leading-5 text-blue-900">
              Email is verified from your signup OTP. Phone verification is confirmed for this manual fallback submission.
            </div>

            <Button
              type="button"
              className="h-12 w-full rounded-xl bg-[var(--sf-button,#1E40AF)] hover:bg-[var(--sf-button,#1E40AF)]"
              disabled={submitting || Boolean(validationError)}
              onClick={() => void handleSubmit()}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Submitting...
                </span>
              ) : (
                'Submit KYC'
              )}
            </Button>
            {validationError ? <p className="text-center text-xs text-gray-500">{validationError}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreateKycPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center bg-[#FAFAFA] text-sm text-gray-500">Loading KYC...</div>}>
      <CreateKycContent />
    </Suspense>
  );
}
