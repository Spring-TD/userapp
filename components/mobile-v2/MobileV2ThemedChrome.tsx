'use client'

import { useEffect, type CSSProperties, type ReactNode } from 'react'

import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'

const DEFAULT_PRIMARY = '#2563EB'
const DEFAULT_SHELL = '#2563EB'
const DEFAULT_BUTTON = '#1E40AF'

export function MobileV2ThemedChrome({ children }: { children: ReactNode }) {
  const { pwaManifest } = useMobileV2Tenant()

  const primary = pwaManifest?.theme_color?.trim()
  const bg = pwaManifest?.background_color?.trim()
  const shell = (bg || primary || DEFAULT_SHELL).trim()

  const vars = {
    '--sf-primary': primary || DEFAULT_PRIMARY,
    '--sf-shell': shell,
    '--sf-button': primary || DEFAULT_BUTTON,
  } as CSSProperties

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

  return (
    <div
      style={vars}
      className="min-h-screen bg-gray-100 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-[400px] h-[850px] bg-white rounded-[40px] shadow-2xl overflow-hidden relative border-8 border-gray-900 ring-1 ring-gray-900/5">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-gray-900 rounded-b-3xl z-50" />
        <div
          className="relative h-full w-full overflow-y-auto no-scrollbar bg-[var(--sf-shell,#2563EB)] transition-[background-color] duration-300"
        >
          {children}
        </div>
      </div>
    </div>
  )
}
