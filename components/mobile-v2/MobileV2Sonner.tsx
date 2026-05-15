'use client'

import { Toaster } from '@/components/ui/sonner'

/** Toasts inside the mobile shell (top-center, above phone chrome). */
export function MobileV2Sonner() {
  return <Toaster position="top-center" richColors closeButton toastOptions={{ className: 'z-[10000]' }} />
}
