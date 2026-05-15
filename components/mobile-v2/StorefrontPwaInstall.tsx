'use client';

import type { PWAInstallElement } from '@khmyznikov/pwa-install';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
import { manifestDescription, pickManifestIconUrl, storefrontDisplayName } from '@/lib/webAppManifest';
import { Button } from '@/components/ui/button';

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isAppleTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export type StorefrontPwaInstallProps = {
  /**
   * When set to a non-empty string, used as the app id for PWA manifest/SW (e.g. from public config).
   * When `undefined`, falls back to tenant `appId` from `MobileV2TenantContext`.
   */
  installAppId?: string | null;
  /** `inline` = onboarding header row (top-left, opposite Skip). */
  variant?: 'inline';
};

/**
 * PWA install: Create App MS artifacts via same-origin proxies:
 * `/api/apps/:appId/pwa/manifest.webmanifest` and `/api/apps/:appId/pwa/sw.js`.
 * `pwaInstall` from resolve is used for display metadata when present.
 */
export function StorefrontPwaInstall({ installAppId }: StorefrontPwaInstallProps) {
  const { appId: tenantAppId, ready, pwaInstall, pwaManifest } = useMobileV2Tenant();
  const pwaRef = useRef<PWAInstallElement | null>(null);
  const [moduleLoaded, setModuleLoaded] = useState(false);
  const [iosHintOpen, setIosHintOpen] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [isApple, setIsApple] = useState(false);
  const [busy, setBusy] = useState(false);

  const effectiveAppId =
    typeof installAppId === 'string' && installAppId.trim() !== ''
      ? installAppId.trim()
      : installAppId === null
        ? null
        : tenantAppId;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const manifestHref = effectiveAppId
    ? `${origin}/api/apps/${encodeURIComponent(effectiveAppId)}/pwa/manifest.webmanifest`
    : '';
  const swRelativePath = effectiveAppId ? `/api/apps/${encodeURIComponent(effectiveAppId)}/pwa/sw.js` : '';

  useEffect(() => {
    setStandalone(isStandaloneDisplay());
    setIsApple(isAppleTouchDevice());
  }, []);

  useEffect(() => {
    void import('@khmyznikov/pwa-install').then(() => setModuleLoaded(true));
  }, []);

  useEffect(() => {
    if (!manifestHref) return;
    const id = 'storefront-pwa-manifest-link';
    document.getElementById(id)?.remove();
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'manifest';
    link.href = manifestHref;
    document.head.appendChild(link);
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [manifestHref]);

  useEffect(() => {
    if (!ready || !effectiveAppId || !swRelativePath || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register(swRelativePath).catch(() => {
      /* dev / HTTP / upstream — unpublished PWA returns 404 */
    });
  }, [ready, effectiveAppId, swRelativePath]);

  const openInstallUi = useCallback(async () => {
    if (busy) return;
    if (standalone) return;
    if (isApple) {
      setIosHintOpen(true);
      return;
    }

    // Without a manifest URL we can't ask the browser to install. Surface a
    // friendly fallback instead of silently doing nothing.
    if (!manifestHref) {
      setFallbackMessage(
        'This store is not configured for installation yet. Use your browser menu to add it to your home screen.',
      );
      setFallbackOpen(true);
      return;
    }

    setBusy(true);
    try {
      // Probe the manifest endpoint so we know whether the browser will be able
      // to satisfy install criteria. If the upstream is unreachable or replies
      // with an error, fall back to a manual "Add to Home Screen" overlay.
      // Resolve already returned `pwaManifest` — skip another upstream manifest round-trip.
      let manifestOk = Boolean(pwaManifest);
      if (!manifestOk) {
        try {
          const head = await fetch(manifestHref, { method: 'GET', cache: 'no-store' });
          manifestOk = head.ok;
        } catch {
          manifestOk = false;
        }
      }

      if (!manifestOk) {
        setFallbackMessage(
          'We could not reach the install manifest for this store. You can still add it to your home screen from your browser menu.',
        );
        setFallbackOpen(true);
        return;
      }

      // `showDialog(true)` forces the dialog even when the browser has not yet
      // fired `beforeinstallprompt`, so the user always sees the install UI.
      const el = pwaRef.current;
      if (el && typeof el.showDialog === 'function') {
        el.showDialog(true);
      } else {
        setFallbackMessage(
          'Install dialog is still loading. Please try again in a moment.',
        );
        setFallbackOpen(true);
      }
    } finally {
      setBusy(false);
    }
  }, [busy, isApple, standalone, manifestHref, pwaManifest]);

  // Hide only when already installed (standalone). The button stays visible at the
  // top-left of the onboarding header even before the tenant `appId` resolves, so
  // merchants always see the install affordance opposite Skip. The pwa-install
  // dialog only registers a real prompt once `manifestHref` is available.
  if (standalone) {
    return null;
  }

  const name =
    storefrontDisplayName(pwaManifest) ||
    (typeof pwaInstall?.name === 'string' && pwaInstall.name.trim() ? pwaInstall.name.trim() : '') ||
    'App';
  const description =
    manifestDescription(pwaManifest) ||
    (typeof pwaInstall?.description === 'string' && pwaInstall.description.trim()
      ? pwaInstall.description.trim()
      : undefined);
  const iconCandidate =
    pickManifestIconUrl(pwaManifest) ||
    (typeof pwaInstall?.icon === 'string' && pwaInstall.icon.trim() ? pwaInstall.icon.trim() : undefined);

  const installButton = (
    <button
      type="button"
      onClick={openInstallUi}
      disabled={busy}
      aria-label="Install app"
      aria-busy={busy || undefined}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:cursor-progress disabled:opacity-70"
    >
      <Download className="h-4 w-4 shrink-0" aria-hidden />
      {busy ? 'Installing…' : 'Install'}
    </button>
  );

  const iosOverlay = iosHintOpen && (
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
    >
      <div className="mb-6 w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2 id="ios-install-title" className="text-base font-semibold text-[#1E293B]">
            Add to Home Screen
          </h2>
          <button
            type="button"
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
            onClick={() => setIosHintOpen(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm leading-relaxed text-gray-600">
          To install this app, tap the <strong>Share</strong> icon{' '}
          <span className="whitespace-nowrap">(□↑)</span> and choose{' '}
          <strong>Add to Home Screen</strong>.
        </p>
        <Button className="mt-4 w-full rounded-xl bg-[var(--sf-button,#1E40AF)]" type="button" onClick={() => setIosHintOpen(false)}>
          OK
        </Button>
      </div>
    </div>
  );

  const fallbackOverlay = fallbackOpen && (
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fallback-install-title"
    >
      <div className="mb-6 w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2 id="fallback-install-title" className="text-base font-semibold text-[#1E293B]">
            Install {name}
          </h2>
          <button
            type="button"
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
            onClick={() => setFallbackOpen(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {fallbackMessage ? (
          <p className="text-sm leading-relaxed text-gray-600">{fallbackMessage}</p>
        ) : null}
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          In your browser menu, choose <strong>Install app</strong> or{' '}
          <strong>Add to Home Screen</strong>.
        </p>
        <Button
          className="mt-4 w-full rounded-xl sf-btn"
          type="button"
          onClick={() => setFallbackOpen(false)}
        >
          OK
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {moduleLoaded && manifestHref ? (
        <pwa-install
          key={manifestHref}
          ref={pwaRef}
          {...{
            'manifest-url': manifestHref,
            name,
            'manual-apple': 'true',
            'use-local-storage': 'true',
            ...(description ? { description } : {}),
            ...(iconCandidate ? { icon: iconCandidate } : {}),
          }}
        />
      ) : null}

      <div className="pointer-events-auto relative z-[110] flex min-w-0 items-center">
        {installButton}
      </div>

      {iosOverlay}
      {fallbackOverlay}
    </>
  );
}
