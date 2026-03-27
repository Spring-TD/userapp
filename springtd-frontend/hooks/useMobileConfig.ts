'use client';

import { useState, useEffect } from 'react';

export interface MobileSplashConfig {
  logo?: string;
  backgroundColor: string;
  textColor: string;
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
}

interface UseMobileConfigReturn {
  config: MobileAppConfig | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DEFAULT_CONFIG: MobileAppConfig = {
  appId: null,
  appName: 'Airpay',
  splash: {
    logo: undefined,
    backgroundColor: '#2563EB',
    textColor: '#FFFFFF',
  },
  onboarding: {
    backgroundColor: '#2563EB',
    secondaryBackgroundColor: '#1d4ed8',
    textColor: '#1e293b',
    secondaryTextColor: '#6b7280',
    buttonColor: '#2563EB',
    buttonTextColor: '#FFFFFF',
    fontFamily: 'Inter',
    steps: [
      {
        id: 'step-1',
        title: 'You ought to know how mortgage works',
        description: 'Get an overview of how you are performing and motivate yourself to achieve even more.',
        image: '/onboarding-chart-original.png',
      },
      {
        id: 'step-2',
        title: 'Track your expenses and save money',
        description: 'Keep track of your spending habits and find new ways to save efficiently.',
        image: '/onboarding-chart-original.png',
      },
      {
        id: 'step-3',
        title: 'Secure your future with smart investments',
        description: 'Invest wisely and watch your wealth grow with our advanced analytics tools.',
        image: '/onboarding-chart-original.png',
      },
    ],
  },
  theme: {
    primaryColor: '#2563EB',
    secondaryColor: '#E5E7EB',
    headerBackgroundColor: '#FFFFFF',
    headerTextColor: '#1F2937',
    bodyBackgroundColor: '#F9FAFB',
    bodyTextColor: '#374151',
  },
};

/**
 * Hook to fetch mobile app configuration
 * 
 * Usage:
 * ```tsx
 * const { config, loading, error } = useMobileConfig({ appId: 'your-app-id' });
 * ```
 * 
 * If no appId is provided, it will try to get it from URL params or use defaults
 */
export function useMobileConfig(options: UseMobileConfigOptions = {}): UseMobileConfigReturn {
  const [config, setConfig] = useState<MobileAppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    // If no appId, use defaults immediately
    if (!options.appId) {
      setConfig(DEFAULT_CONFIG);
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
        // Use defaults if fetch fails
        setConfig(DEFAULT_CONFIG);
        if (data.error) {
          console.warn('Failed to fetch config, using defaults:', data.error);
        }
      }
    } catch (err) {
      console.error('Error fetching mobile config:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch configuration');
      // Use defaults on error
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [options.appId]);

  return {
    config,
    loading,
    error,
    refetch: fetchConfig,
  };
}

export default useMobileConfig;
