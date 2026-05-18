'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/endpoints';
import {
  buildModularVerificationPostBody,
  pickVerificationUrlFromCreate,
  pickVerificationUrlFromGet,
} from '@/lib/kycModularClient';
import { clientAuthErrorFromResponse } from '@/lib/normalizeClientAuthError';
import type {
  KycModularVerificationCreateResponse,
  KycModularVerificationUrlResponse,
} from '@/types/kycModular';

export default function CreateKycPage() {
  const [postLoading, setPostLoading] = useState(false);
  const [getLoading, setGetLoading] = useState(false);

  /** Step 1 — creates modular verification on compliance-ms / Fuspay (needs `fuspay.customerId` from signup). */
  const handleCreateVerification = async () => {
    setPostLoading(true);
    try {
      const body = buildModularVerificationPostBody();
      const res = await apiClient.post<KycModularVerificationCreateResponse>(
        ENDPOINTS.kyc.modularVerification,
        Object.keys(body).length ? body : {},
        { includeAuth: true, timeout: 60_000 },
      );

      const apiErr = clientAuthErrorFromResponse(res.data, res.status);
      if (apiErr) {
        toast.error(apiErr.message);
        return;
      }

      const immediateUrl = pickVerificationUrlFromCreate(res.data);
      if (immediateUrl) {
        toast.success('Verification ready. Opening hosted KYC…');
        window.location.assign(immediateUrl);
        return;
      }

      if (res.status >= 200 && res.status < 300) {
        toast.success(
          'Verification created. Use “Open verification link” if the partner did not open automatically.',
        );
        return;
      }

      toast.error(res.data?.error || res.data?.message || 'Create verification failed.');
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? '')
          : ''
      toast.error(msg || (e instanceof Error ? e.message : 'Create verification failed.'));
    } finally {
      setPostLoading(false);
    }
  };

  /** Step 2 — fetches hosted URL after create (or when POST did not return a URL). */
  const handleOpenVerificationUrl = async () => {
    setGetLoading(true);
    try {
      const res = await apiClient.get<KycModularVerificationUrlResponse>(
        ENDPOINTS.kyc.modularVerificationUrl,
        { includeAuth: true, timeout: 30_000 },
      );

      const apiErr = clientAuthErrorFromResponse(res.data, res.status);
      if (apiErr) {
        toast.error(apiErr.message);
        return;
      }

      const verificationUrl = pickVerificationUrlFromGet(res.data);
      if (!verificationUrl) {
        toast.error(
          res.data?.error ||
            res.data?.message ||
            'No verification URL yet. Complete step 1 first, or check compliance / Fuspay configuration.',
        );
        return;
      }

      window.location.assign(verificationUrl);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? '')
          : ''
      toast.error(msg || (e instanceof Error ? e.message : 'Could not load verification link.'));
    } finally {
      setGetLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA]">
      <div className="pt-12 px-6 flex items-center mb-6">
        <Link href="/mobile-v2/profile" className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-700">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="flex-1 text-center text-lg font-bold text-[#1E293B] mr-8">KYC</h1>
      </div>

      <div className="px-6 pb-8 flex-1 flex flex-col justify-center space-y-4">
        <p className="text-center text-sm text-gray-500">
          <strong className="text-[#1E293B]">Step 1</strong> creates your modular verification (Fuspay). You need a
          profile with <code className="rounded bg-gray-100 px-1 text-xs">fuspay.customerId</code> from signup.
        </p>
        <p className="text-center text-sm text-gray-500">
          <strong className="text-[#1E293B]">Step 2</strong> loads the hosted verification URL when step 1 did not
          return a link yet.
        </p>

        <Button
          type="button"
          className="w-full h-12 rounded-xl bg-[var(--sf-button,#1E40AF)] hover:bg-[var(--sf-button,#1E40AF)]"
          disabled={postLoading || getLoading}
          onClick={() => void handleCreateVerification()}
        >
          {postLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Creating…
            </span>
          ) : (
            '1 — Create verification'
          )}
        </Button>

        {/* <Button
          type="button"
          variant="outline"
          className="w-full h-12 rounded-xl border-[var(--sf-button,#1E40AF)] text-[var(--sf-button,#1E40AF)]"
          disabled={postLoading || getLoading}
          onClick={() => void handleOpenVerificationUrl()}
        >
          {getLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading link…
            </span>
          ) : (
            '2 — Open verification link (GET)'
          )}
        </Button> */}
      </div>
    </div>
  );
}
