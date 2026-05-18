'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/endpoints';
import {
  buildModularVerificationPostBody,
  isFuspayCustomerMissingError,
  KYC_FUSPAY_MISSING_MESSAGE,
  KYC_TENANT_REQUIRED_MESSAGE,
  pickVerificationUrlFromCreate,
} from '@/lib/kycModularClient';
import { readTenantFromSession } from '@/lib/mobileTenant/readTenantFromSession';
import { clientAuthErrorFromResponse } from '@/lib/normalizeClientAuthError';
import type { KycModularVerificationCreateResponse } from '@/types/kycModular';

function resolveKycTenant(tenant: ReturnType<typeof useMobileV2Tenant>) {
  const stored = readTenantFromSession();
  return {
    ready: tenant.ready,
    subdomain: tenant.tenantSubdomain ?? stored.subdomain,
    merchantId: tenant.merchantId ?? stored.merchantId,
    appId: tenant.appId ?? stored.appId,
  };
}

export default function CreateKycPage() {
  const tenant = useMobileV2Tenant();
  const t = resolveKycTenant(tenant);
  const [postLoading, setPostLoading] = useState(false);

  const handleCreateVerification = async () => {
    if (!t.ready) {
      toast.message('Loading store…', { description: 'Please wait a moment and try again.' });
      return;
    }
    if (!t.subdomain && !t.merchantId) {
      toast.error(KYC_TENANT_REQUIRED_MESSAGE);
      return;
    }

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
        toast.error(
          isFuspayCustomerMissingError(apiErr.message) ? KYC_FUSPAY_MISSING_MESSAGE : apiErr.message,
        );
        return;
      }

      const immediateUrl = pickVerificationUrlFromCreate(res.data);
      if (immediateUrl) {
        toast.success('Verification ready. Opening hosted KYC…');
        window.location.assign(immediateUrl);
        return;
      }

      if (res.status >= 200 && res.status < 300) {
        toast.success('Verification created.');
        return;
      }

      const errText = res.data?.error || res.data?.message || 'Create verification failed.';
      toast.error(isFuspayCustomerMissingError(errText) ? KYC_FUSPAY_MISSING_MESSAGE : errText);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? '')
          : '';
      const fallback = msg || (e instanceof Error ? e.message : 'Create verification failed.');
      toast.error(isFuspayCustomerMissingError(fallback) ? KYC_FUSPAY_MISSING_MESSAGE : fallback);
    } finally {
      setPostLoading(false);
    }
  };

  const tenantLabel = t.subdomain ? `Store: ${t.subdomain}` : t.merchantId ? 'Store linked' : null;

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA]">
      <div className="pt-12 px-6 flex items-center mb-6">
        <Link href="/mobile-v2/profile" className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-700">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="flex-1 text-center text-lg font-bold text-[#1E293B] mr-8">KYC</h1>
      </div>

      <div className="px-6 pb-8 flex-1 flex flex-col justify-center space-y-4">
        {tenantLabel ? (
          <p className="text-center text-xs text-gray-400">{tenantLabel}</p>
        ) : (
          <p className="text-center text-xs text-amber-700">{KYC_TENANT_REQUIRED_MESSAGE}</p>
        )}

        <Button
          type="button"
          className="w-full h-12 rounded-xl bg-[var(--sf-button,#1E40AF)] hover:bg-[var(--sf-button,#1E40AF)]"
          disabled={postLoading || !t.ready}
          onClick={() => void handleCreateVerification()}
        >
          {postLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Starting…
            </span>
          ) : (
            'Start verification'
          )}
        </Button>
      </div>
    </div>
  );
}
