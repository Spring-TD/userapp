'use client';

import { useState, useEffect } from 'react';
import { emptyMobileShellConfig } from '@/lib/webAppManifest';

export interface MobileSplashConfig {
  logo?: string
  /** Centered splash/onboarding mark (logo). Not a full-bleed background. */
  image?: string
  backgroundColor: string
  textColor: string
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  image?: string;
}

export interface MobileOnboardingConfig {
  backgroundColor: string;
  secondaryBackgroundColor: string;
  textColor: string;
  secondaryTextColor: string;
  buttonColor: string;
  buttonTextColor: string;
  fontFamily: string;
  steps: OnboardingStep[];
}

export interface MobileThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  headerBackgroundColor: string;
  headerTextColor: string;
  bodyBackgroundColor: string;
  bodyTextColor: string;
}

export interface MobileAppConfig {
  appId: string | null;
  appName: string;
  splash: MobileSplashConfig;
  onboarding: MobileOnboardingConfig;
  theme: MobileThemeConfig;
}

interface UseMobileConfigOptions {
  appId?: string;
  /** Skip the legacy public-configuration fetch (storefront uses pwaManifest instead). */
  skip?: boolean;
}

interface UseMobileConfigReturn {
  config: MobileAppConfig | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Legacy hook: `GET /api/apps/[appId]/configuration/public`.
 * Storefront splash/onboarding should use resolve `pwaManifest` instead of this.
 */
export function useMobileConfig(options: UseMobileConfigOptions = {}): UseMobileConfigReturn {
  const [config, setConfig] = useState<MobileAppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    if (options.skip || !options.appId) {
      setConfig(emptyMobileShellConfig(options.appId ?? null));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/apps/${options.appId}/configuration/public`);
      const data = await response.json();

      if (data.success && data.data) {
        setConfig(data.data);
      } else {
        setConfig(emptyMobileShellConfig(options.appId));
        if (data.error) {
          console.warn('Failed to fetch config, using empty shell:', data.error);
        }
      }
    } catch (err) {
      console.error('Error fetching mobile config:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch configuration');
      setConfig(emptyMobileShellConfig(options.appId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [options.appId, options.skip]);

  return {
    config,
    loading,
    error,
    refetch: fetchConfig,
  };
}

export default useMobileConfig;
