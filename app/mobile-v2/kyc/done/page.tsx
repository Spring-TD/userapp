'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MOBILE_USER_KYC_COMPLETE_KEY } from '@/lib/kycApproval';
import { refreshModularKycStatus } from '@/lib/kycModularClient';

/** Return target after modular KYC `redirect` (see `modularKycRedirectUrl`). */
export default function KycDonePage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>('pending');
  const [complete, setComplete] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      try {
        const result = await refreshModularKycStatus();
        if (cancelled) return;
        setStatus(result.status || 'pending');
        setComplete(result.complete);
        if (result.complete) {
          try {
            localStorage.setItem(MOBILE_USER_KYC_COMPLETE_KEY, '1');
          } catch {
            /* ignore */
          }
          setChecking(false);
          return;
        }
      } catch {
        if (!cancelled) {
          setStatus('pending');
          setComplete(false);
        }
      }

      if (attempts < 8 && !cancelled) {
        window.setTimeout(() => {
          void poll();
        }, 2500);
        return;
      }
      if (!cancelled) setChecking(false);
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full flex-col bg-[#FAFAFA] px-6 pt-12">
      <Link href="/mobile-v2/profile" className="mb-8 inline-flex w-10 items-center justify-center text-gray-700">
        <ChevronLeft className="h-6 w-6" />
      </Link>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {checking ? (
          <>
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-[var(--sf-button,#1E40AF)]" />
            <h1 className="mb-2 text-xl font-bold text-[#1E293B]">Checking verification</h1>
            <p className="max-w-sm text-sm text-gray-600">
              We are syncing your FusPay verification status. This usually takes a few seconds.
            </p>
          </>
        ) : complete ? (
          <>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="mb-2 text-xl font-bold text-[#1E293B]">Verification complete</h1>
            <p className="mb-8 max-w-sm text-sm text-gray-600">
              Your identity verification is complete. You can continue using the app.
            </p>
            <Button
              className="w-full max-w-sm rounded-xl bg-[var(--sf-button,#1E40AF)]"
              onClick={() => router.replace('/mobile-v2/home')}
            >
              Continue to Home
            </Button>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-xl font-bold text-[#1E293B]">Verification received</h1>
            <p className="mb-2 max-w-sm text-sm text-gray-600">
              If you finished the hosted flow, your status will update when the provider calls our webhook.
            </p>
            <p className="mb-8 text-xs uppercase tracking-wide text-gray-400">Current status: {status}</p>
            <div className="flex w-full max-w-sm flex-col gap-3">
              <Button asChild className="w-full rounded-xl bg-[var(--sf-button,#1E40AF)]">
                <Link href="/mobile-v2/profile/kyc/create">Back to KYC</Link>
              </Button>
              <Button asChild variant="outline" className="w-full rounded-xl">
                <Link href="/mobile-v2/profile">Back to profile</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
