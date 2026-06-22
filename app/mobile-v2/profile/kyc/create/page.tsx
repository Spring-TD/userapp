'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronLeft, ExternalLink, Loader2, ScanFace, ShieldCheck, Sparkles } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getSecureAccessTokenSync } from '@/lib/tokenManager';
import {
  formatKycClientError,
  isFuspayCustomerMissingError,
  isModularKycCompleteFromUrlData,
  KYC_FUSPAY_MISSING_MESSAGE,
  KYC_TENANT_REQUIRED_MESSAGE,
  openModularKycUrl,
  pickVerificationUrlFromGet,
  resolveModularKycLink,
} from '@/lib/kycModularClient';
import type { KycModularVerificationUrlData } from '@/types/kycModular';

function statusLabel(data?: KycModularVerificationUrlData | null): string {
  const raw = (data?.overallStatus || data?.status || 'pending').replace(/_/g, ' ');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

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
        Complete secure identity verification with FusPay before using product applications.
      </p>
    </div>
  );
}

function CreateKycContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromRegistration = searchParams.get('from') === 'registration';
  const initialEmail = searchParams.get('email')?.trim().toLowerCase() || '';
  const [snapshot, setSnapshot] = useState<KycModularVerificationUrlData | null>(null);
  const [opening, setOpening] = useState(false);
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

  const complete = isModularKycCompleteFromUrlData(snapshot);
  const savedUrl = pickVerificationUrlFromGet(snapshot ? { success: true, data: snapshot } : null);
  const pending = Boolean(snapshot) && !complete;

  const finishAfterKyc = async () => {
    if (fromRegistration) {
      router.replace('/mobile-v2/home');
      return;
    }
    router.replace('/mobile-v2/profile');
  };

  const handleOpenKyc = async () => {
    setOpening(true);
    setError(null);
    try {
      const result = await resolveModularKycLink();
      setSnapshot((current) => ({
        ...current,
        verificationId: result.verificationId || current?.verificationId,
        verificationUrl: result.url,
        status: result.status || current?.status || 'pending',
        overallStatus: result.status || current?.overallStatus || 'pending',
      }));
      if (result.reused) {
        toast.message('Resuming your existing verification link.');
      }
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
      setOpening(false);
    }
  };

  const handleContinueSaved = () => {
    if (!savedUrl) {
      void handleOpenKyc();
      return;
    }
    openModularKycUrl(savedUrl);
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

          {complete ? (
            <div className="mt-10 rounded-[28px] border border-green-100 bg-white p-7 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-[#1E293B]">KYC completed</h3>
              <p className="mx-auto mt-2 max-w-[260px] text-sm leading-6 text-gray-500">
                Your identity verification is complete.
              </p>
              <Button className="mt-7 h-12 w-full rounded-2xl bg-[var(--sf-button,#1E40AF)]" onClick={() => void finishAfterKyc()}>
                {fromRegistration ? 'Continue to Home' : 'Back to Profile'}
              </Button>
            </div>
          ) : (
            <div className="mt-10 space-y-4">
              {error ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-center text-sm leading-6 text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-sm">
                <div className="bg-gradient-to-b from-[color-mix(in_srgb,var(--sf-button,#1E40AF)_8%,white)] to-white px-6 pb-2 pt-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--sf-button,#1E40AF)] shadow-sm ring-1 ring-blue-50">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-[#1E293B]">
                    {pending ? 'Continue verification' : 'Start verification'}
                  </h3>
                  <p className="mx-auto mt-2 max-w-[280px] text-sm leading-6 text-gray-500">
                    {pending
                      ? `Your verification is ${statusLabel(snapshot).toLowerCase()}. Tap below to resume the hosted FusPay flow.`
                      : 'Tap below to open FusPay. When you finish, you will return here automatically.'}
                  </p>
                </div>

                <div className="space-y-4 px-6 pb-6 pt-4">
                  {pending ? (
                    <div className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-xs text-amber-900">
                      Status: {statusLabel(snapshot)}
                      {snapshot?.completedChecks != null && snapshot?.totalChecks != null
                        ? ` · ${snapshot.completedChecks}/${snapshot.totalChecks} checks`
                        : null}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-blue-50 px-4 py-3 text-center text-xs leading-5 text-blue-900">
                      Your FusPay customer was linked at registration. Tap Complete KYC to create your verification link.
                    </div>
                  )}

                  <Button
                    type="button"
                    className="h-12 w-full rounded-2xl bg-[var(--sf-button,#1E40AF)] text-sm font-semibold shadow-[0_10px_24px_rgba(30,64,175,0.22)] hover:bg-[var(--sf-button,#1E40AF)]"
                    disabled={opening}
                    onClick={() => void (pending && savedUrl ? handleContinueSaved() : handleOpenKyc())}
                  >
                    {opening ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Preparing link...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        {pending ? 'Continue KYC' : 'Complete KYC'}
                        <ExternalLink className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              <p className="px-2 text-center text-xs leading-5 text-gray-400">
                After verification, you will land on the confirmation screen while we sync your status.
              </p>
            </div>
          )}
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
