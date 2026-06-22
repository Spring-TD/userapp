'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ExternalLink, Loader2, ScanFace, Sparkles } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getSecureAccessTokenSync } from '@/lib/tokenManager';
import {
  formatKycClientError,
  isFuspayCustomerMissingError,
  KYC_FUSPAY_MISSING_MESSAGE,
  KYC_TENANT_REQUIRED_MESSAGE,
  openModularKycUrl,
  resolveModularKycLink,
} from '@/lib/kycModularClient';

function KycHero() {
  return (
    <div className="flex flex-col items-center px-2 text-center">
      <div className="relative mb-6">
        <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color-mix(in_srgb,var(--sf-button,#1E40AF)_18%,white)] blur-2xl" />
        <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-gradient-to-br from-white to-blue-50 shadow-[0_8px_30px_rgba(30,64,175,0.12)] ring-1 ring-blue-100">
          <ScanFace className="h-9 w-9 text-[var(--sf-button,#1E40AF)]" strokeWidth={1.75} />
        </div>
        <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--sf-button,#1E40AF)] text-white shadow-md">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      </div>
      <h2 className="max-w-[280px] text-[26px] font-bold leading-tight tracking-tight text-[#1E293B]">
        Verify your identity
      </h2>
      <p className="mt-3 max-w-[300px] text-sm leading-6 text-gray-500">
        Tap Start KYC to open FusPay and complete verification with your QR scan.
      </p>
    </div>
  );
}

function CreateKycContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromRegistration = searchParams.get('from') === 'registration';
  const initialEmail = searchParams.get('email')?.trim().toLowerCase() || '';
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginRedirectPath = useMemo(() => {
    const params = new URLSearchParams({ from: 'registration' });
    if (initialEmail) params.set('email', initialEmail);
    return `/mobile-v2/profile/kyc/create?${params.toString()}`;
  }, [initialEmail]);

  useEffect(() => {
    if (!fromRegistration) return;
    if (getSecureAccessTokenSync()) return;
    const loginUrl = `/mobile-v2/auth/login?email=${encodeURIComponent(initialEmail)}&verified=1&next=${encodeURIComponent(loginRedirectPath)}`;
    router.replace(loginUrl);
  }, [fromRegistration, initialEmail, loginRedirectPath, router]);

  const handleStartKyc = async () => {
    setStarting(true);
    setError(null);
    try {
      const result = await resolveModularKycLink();
      openModularKycUrl(result.url);
    } catch (err) {
      const message = formatKycClientError(err instanceof Error ? err.message : 'Could not start KYC verification');
      if (/tenant|subdomain/i.test(message)) {
        setError(KYC_TENANT_REQUIRED_MESSAGE);
      } else if (isFuspayCustomerMissingError(message)) {
        setError(KYC_FUSPAY_MISSING_MESSAGE);
      } else if (/token|authentication|unauthorized/i.test(message)) {
        router.replace(
          `/mobile-v2/auth/login?email=${encodeURIComponent(initialEmail)}&verified=1&next=${encodeURIComponent(loginRedirectPath)}`,
        );
        return;
      } else {
        setError(message);
      }
      toast.error(message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#FAFAFA]">
      <div className="mb-2 flex items-center px-6 pt-12">
        <Link
          href={fromRegistration ? '/mobile-v2/auth/login' : '/mobile-v2/profile'}
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-black/5"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="mr-8 flex-1 text-center text-lg font-bold text-[#1E293B]">KYC</h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-10 no-scrollbar">
        <div className="mx-auto w-full max-w-md pt-4">
          <KycHero />

          <div className="mt-10 space-y-4">
            {error ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-center text-sm leading-6 text-red-700">
                {error}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-[28px] border border-gray-100 bg-white px-6 py-8 text-center shadow-sm">
              <p className="mx-auto mb-6 max-w-[280px] text-sm leading-6 text-gray-500">
                You will be redirected to FusPay to scan and verify. When finished, you will return here automatically.
              </p>

              <Button
                type="button"
                className="h-12 w-full max-w-xs rounded-2xl bg-[var(--sf-button,#1E40AF)] text-sm font-semibold shadow-[0_10px_24px_rgba(30,64,175,0.22)] hover:bg-[var(--sf-button,#1E40AF)]"
                disabled={starting}
                onClick={() => void handleStartKyc()}
              >
                {starting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Opening FusPay...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Start KYC
                    <ExternalLink className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
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
