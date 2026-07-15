"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"

import { MobileV2LayoutSkeleton } from "@/components/mobile-v2/data-skeletons"
import {
  hasValidAccessToken,
  isMobileV2AuthPublicPath,
  redirectToMobileV2Login,
} from "@/lib/mobileV2AuthSession"

/**
 * Client-side fallback when middleware cannot run (e.g. client navigations).
 * Redirects unauthenticated users away from protected mobile-v2 routes.
 */
export function MobileV2AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname() || ""
  const isPublic = isMobileV2AuthPublicPath(pathname)
  const [allowed, setAllowed] = useState(isPublic)

  useEffect(() => {
    if (isPublic) {
      setAllowed(true)
      return
    }

    if (!hasValidAccessToken()) {
      redirectToMobileV2Login()
      return
    }

    setAllowed(true)
  }, [isPublic, pathname])

  if (!allowed) {
    return <MobileV2LayoutSkeleton />
  }

  return <div className="flex h-full min-h-0 flex-col overflow-hidden">{children}</div>
}
