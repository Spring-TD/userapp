'use client'

import { useState } from 'react'

type StorefrontMerchantLogoProps = {
  companyLogoUrl?: string | null
  /** Fallback when KYC logo is missing — typically `pickManifestIconUrl(pwaManifest)`. */
  manifestIconUrl?: string | null
  companyName?: string | null
  fallbackText?: string
  className?: string
  imgClassName?: string
  textClassName?: string
}

/** Merchant logo: KYC company logo → manifest icon → name text. */
export function StorefrontMerchantLogo({
  companyLogoUrl,
  manifestIconUrl,
  companyName,
  fallbackText = 'Merchant',
  className = '',
  imgClassName = 'mx-auto h-10 w-auto max-w-[160px] object-contain',
  textClassName = 'text-lg font-semibold text-[var(--sf-ink,#1E1B4B)]',
}: StorefrontMerchantLogoProps) {
  const [failedPrimary, setFailedPrimary] = useState(false)
  const [failedManifest, setFailedManifest] = useState(false)

  const primary = !failedPrimary && companyLogoUrl?.trim() ? companyLogoUrl.trim() : null
  const secondary =
    !primary && !failedManifest && manifestIconUrl?.trim() ? manifestIconUrl.trim() : null
  const src = primary || secondary
  const label = companyName?.trim() || fallbackText

  if (src) {
    return (
      <div className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element -- merchant CDN / manifest URL */}
        <img
          src={src}
          alt={label}
          className={imgClassName}
          onError={() => {
            if (primary) setFailedPrimary(true)
            else setFailedManifest(true)
          }}
        />
      </div>
    )
  }

  return (
    <div className={className}>
      <span className={textClassName}>{label}</span>
    </div>
  )
}
