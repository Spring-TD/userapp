'use client'

import { useEffect, type CSSProperties, type ReactNode } from 'react'

import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import { buildStorefrontBrandCssVars } from '@/lib/storefrontBranding'
import { pickManifestIconUrl } from '@/lib/webAppManifest'

export function MobileV2ThemedChrome({ children }: { children: ReactNode }) {
  const { pwaManifest, displayName } = useMobileV2Tenant()

  const brandVars = buildStorefrontBrandCssVars(pwaManifest) as CSSProperties

  useEffect(() => {
    const tc = pwaManifest?.theme_color?.trim()
    if (!tc || typeof document === 'undefined') return
    let el = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute('name', 'theme-color')
      document.head.appendChild(el)
    }
    const prev = el.getAttribute('content') || ''
    el.setAttribute('content', tc)
    return () => {
      if (prev) el?.setAttribute('content', prev)
      else el?.removeAttribute('content')
    }
  }, [pwaManifest?.theme_color])

  useEffect(() => {
    if (!displayName || typeof document === 'undefined') return
    const prev = document.title
    document.title = displayName
    return () => {
      document.title = prev
    }
  }, [displayName])

  useEffect(() => {
    const href = pickManifestIconUrl(pwaManifest)
    if (!href || typeof document === 'undefined') return
    const id = 'storefront-apple-touch-icon'
    document.getElementById(id)?.remove()
    const link = document.createElement('link')
    link.id = id
    link.rel = 'apple-touch-icon'
    link.href = href
    document.head.appendChild(link)
    return () => {
      document.getElementById(id)?.remove()
    }
  }, [pwaManifest])

  return (
    <div
      className="sf-storefront-root min-h-[100dvh] w-full md:min-h-screen md:flex md:items-center md:justify-center md:bg-gray-100 md:p-4"
      style={brandVars}
    >
      {/* Phone preview frame — md+ only; mobile uses full viewport width */}
      <div className="relative flex h-[100dvh] w-full min-h-0 flex-col overflow-hidden bg-white md:h-[850px] md:max-w-[400px] md:rounded-[40px] md:border-8 md:border-gray-900 md:shadow-2xl md:ring-1 md:ring-gray-900/5">
        <div
          className="pointer-events-none absolute top-0 left-1/2 z-50 hidden h-7 w-40 -translate-x-1/2 rounded-b-3xl bg-gray-900 md:block"
          aria-hidden
        />
        {/* Pages fill the frame; they own scrolling + sticky bottom nav */}
        <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-[var(--sf-page-bg-tint,var(--sf-shell,#2563EB))] transition-[background-color] duration-300">
          {children}
        </div>
      </div>
    </div>
  )
}
