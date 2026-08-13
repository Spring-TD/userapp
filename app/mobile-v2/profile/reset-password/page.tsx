'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  requestPasswordChangeOtp,
  savePasswordChangeDraft,
} from '@/lib/passwordChangeClient'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleContinue = async () => {
    if (!currentPassword.trim()) {
      const msg = 'Enter your current password.'
      setError(msg)
      toast.error(msg)
      return
    }
    if (newPassword.length < 8) {
      const msg = 'New password must be at least 8 characters.'
      setError(msg)
      toast.error(msg)
      return
    }
    if (newPassword !== confirmPassword) {
      const msg = 'New password and confirmation do not match.'
      setError(msg)
      toast.error(msg)
      return
    }
    if (newPassword === currentPassword) {
      const msg = 'New password must be different from your current password.'
      setError(msg)
      toast.error(msg)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      savePasswordChangeDraft({
        currentPassword: currentPassword.trim(),
        newPassword,
      })
      const otp = await requestPasswordChangeOtp()
      if (!otp.ok) {
        setError(otp.error)
        toast.error(otp.error)
        return
      }
      toast.success('Verification code sent to your email.')
      router.push('/mobile-v2/profile/reset-password/otp')
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : 'Could not start password reset.'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex h-full flex-col sf-page-bg">
      <div className="mb-8 flex items-center px-6 pt-12">
        <Link
          href="/mobile-v2/profile"
          className="-ml-2 flex h-10 w-10 items-center justify-center text-gray-700"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
      </div>

      <div className="flex w-full flex-col items-start px-6 text-left">
        <div className="mb-6 flex h-14 w-14 items-center justify-center self-start rounded-2xl sf-accent-soft sf-text-primary">
          <Lock className="h-7 w-7" />
        </div>

        <h1 className="mb-2 w-full text-left text-2xl font-bold text-[#1E293B]">Reset Password</h1>
        <p className="mb-8 w-full text-left text-sm leading-relaxed text-gray-500">
          Enter your current password and choose a new one. We’ll send a verification code to your email.
        </p>

        <div className="w-full space-y-4">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="h-14 w-full rounded-full bg-gray-100 px-5 text-sm outline-none ring-[var(--sf-button,#1E40AF)]/20 placeholder:text-gray-400 focus:ring-2"
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-14 w-full rounded-full bg-gray-100 px-5 text-sm outline-none ring-[var(--sf-button,#1E40AF)]/20 placeholder:text-gray-400 focus:ring-2"
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-14 w-full rounded-full bg-gray-100 px-5 text-sm outline-none ring-[var(--sf-button,#1E40AF)]/20 placeholder:text-gray-400 focus:ring-2"
          />
        </div>

        {error ? (
          <p className="mt-4 w-full rounded-xl bg-red-50 px-3 py-2 text-center text-xs text-red-600">{error}</p>
        ) : null}

        <div className="min-h-4 flex-1" />

        <Button
          type="button"
          disabled={submitting}
          onClick={() => void handleContinue()}
          className="sf-btn mb-8 mt-8 h-14 w-full rounded-full text-base font-semibold shadow-lg"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending code…
            </span>
          ) : (
            'Continue'
          )}
        </Button>
      </div>
    </div>
  )
}
