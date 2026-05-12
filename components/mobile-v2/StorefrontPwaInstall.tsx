'use client';

import type { PWAInstallElement } from '@khmyznikov/pwa-install';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
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

/**
 * Storefront PWA install for mobile-v2:
 * - Subdomain resolve may return `data.pwaInstall` (name, description, icon, …)
 * - Manifest + SW use same-origin Create App MS proxies (`/api/apps/:id/pwa/…`)
 * - `navigator.serviceWorker.register` + `<link rel="manifest">`
 * - `@khmyznikov/pwa-install` for non‑iOS; iOS uses Share → Add to Home Screen copy
 */
export function StorefrontPwaInstall() {
  const { appId, ready, pwaInstall } = useMobileV2Tenant();
  const pwaRef = useRef<PWAInstallElement | null>(null);
  const [moduleLoaded, setModuleLoaded] = useState(false);
  const [iosHintOpen, setIosHintOpen] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [isApple, setIsApple] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const manifestHref = appId ? `${origin}/api/apps/${encodeURIComponent(appId)}/pwa/manifest.webmanifest` : '';
  const swRelativePath = appId ? `/api/apps/${encodeURIComponent(appId)}/pwa/sw.js` : '';

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
    if (!ready || !appId || !swRelativePath || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register(swRelativePath).catch(() => {
      /* dev / HTTP / upstream */
    });
  }, [ready, appId, swRelativePath]);

  const openInstallUi = useCallback(() => {
    if (standalone) return;
    if (isApple) {
      setIosHintOpen(true);
      return;
    }
    pwaRef.current?.showDialog?.();
  }, [isApple, standalone]);

  if (!ready || !appId || standalone || !manifestHref) {
    return null;
  }

  const name =
    typeof pwaInstall?.name === 'string' && pwaInstall.name.trim()
      ? pwaInstall.name.trim()
      : 'App';
  const description =
    typeof pwaInstall?.description === 'string' && pwaInstall.description.trim()
      ? pwaInstall.description.trim()
      : undefined;
  const icon =
    typeof pwaInstall?.icon === 'string' && pwaInstall.icon.trim() ? pwaInstall.icon.trim() : undefined;

  return (
    <>
      {moduleLoaded ? (
        <pwa-install
          ref={pwaRef}
          {...{
            'manifest-url': manifestHref,
            name,
            'manual-apple': 'true',
            'use-local-storage': 'true',
            ...(description ? { description } : {}),
            ...(icon ? { icon } : {}),
          }}
        />
      ) : null}

      <div className="pointer-events-auto absolute bottom-4 right-4 z-[60]">
        <Button
          type="button"
          size="sm"
          className="h-10 rounded-full bg-white/95 px-4 text-[#1E40AF] shadow-lg ring-1 ring-black/10 hover:bg-white"
          onClick={openInstallUi}
        >
          <Download className="mr-1.5 h-4 w-4" aria-hidden />
          Install app
        </Button>
      </div>

      {iosHintOpen && (
        <div
          className="absolute inset-0 z-[70] flex items-end justify-center bg-black/50 p-4"
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
            <Button className="mt-4 w-full rounded-xl bg-[#1E40AF]" type="button" onClick={() => setIosHintOpen(false)}>
              OK
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
