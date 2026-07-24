'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { fetchAuthUserProfile } from '@/lib/userProfileClient'
import {
  changePasswordWithOtp,
  clearPasswordChangeDraft,
  readPasswordChangeDraft,
  requestPasswordChangeOtp,
} from '@/lib/passwordChangeClient'

export default function OTPPage() {
  const router = useRouter()
  const [seconds, setSeconds] = useState(60)
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const draft = readPasswordChangeDraft()
    if (!draft) {
      toast.error('Start again from Reset Password.')
      router.replace('/mobile-v2/profile/reset-password')
      return
    }

    void (async () => {
      const { user } = await fetchAuthUserProfile()
      setEmail(user?.email?.trim() || '')
    })()
  }, [router])

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleResend = async () => {
    if (seconds > 0 || resending) return
    setResending(true)
    setError(null)
    try {
      const result = await requestPasswordChangeOtp()
      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      setSeconds(60)
      toast.success('A new verification code was sent to your email.')
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : 'Could not resend code.'
      setError(msg)
      toast.error(msg)
    } finally {
      setResending(false)
    }
  }

  const handleConfirm = async () => {
    const draft = readPasswordChangeDraft()
    if (!draft) {
      toast.error('Start again from Reset Password.')
      router.replace('/mobile-v2/profile/reset-password')
      return
    }
    if (code.trim().length < 4) {
      const msg = 'Enter the verification code from your email.'
      setError(msg)
      toast.error(msg)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const result = await changePasswordWithOtp({
        currentPassword: draft.currentPassword,
        newPassword: draft.newPassword,
        code: code.trim(),
      })
      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      clearPasswordChangeDraft()
      toast.success(result.message || 'Password updated successfully.')
      router.replace('/mobile-v2/profile')
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : 'Could not change password.'
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
          href="/mobile-v2/profile/reset-password"
          className="-ml-2 flex h-10 w-10 items-center justify-center text-gray-700"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
      </div>

      <div className="flex w-full flex-col items-start px-6 text-left">
        <div className="mb-6 flex h-14 w-14 items-center justify-center self-start rounded-2xl bg-blue-50 text-[var(--sf-primary,#2563EB)]">
          <MessageSquare className="h-7 w-7 fill-current" />
        </div>

        <h1 className="mb-3 w-full text-left text-2xl font-bold text-[#1E293B]">Enter OTP</h1>
        <p className="mb-10 w-full text-left text-sm leading-relaxed text-gray-500">
          {email
            ? <>We sent a one-time verification code to <strong>{email}</strong>.</>
            : 'We sent a one-time verification code to your email.'}
        </p>

        <div className="mb-10 w-full">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            autoFocus
            inputMode="numeric"
            pattern="[0-9]*"
            containerClassName="flex w-full flex-nowrap justify-start gap-3 sm:gap-4"
          >
            <InputOTPGroup className="flex-nowrap gap-3 sm:gap-4">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <InputOTPSlot
                  key={idx}
                  index={idx}
                  className="h-10 w-10 rounded-full border-none bg-gray-200 p-0 text-base font-semibold text-[var(--sf-ink,#1E293B)] shadow-none ring-0 data-[active=true]:bg-[var(--sf-primary,#2563EB)] data-[active=true]:text-white data-[active=true]:ring-0"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <p className="mb-4 w-full text-left text-sm text-gray-500">
          {seconds > 0 ? (
            <>
              You can get a code again in{' '}
              <span className="font-semibold text-[var(--sf-primary,#2563EB)]">{seconds} seconds</span>
            </>
          ) : (
            <button
              type="button"
              disabled={resending}
              onClick={() => void handleResend()}
              className="font-semibold text-[var(--sf-primary,#2563EB)]"
            >
              {resending ? 'Sending…' : 'Resend code'}
            </button>
          )}
        </p>

        {error ? (
          <p className="mb-4 w-full rounded-xl bg-red-50 px-3 py-2 text-center text-xs text-red-600">{error}</p>
        ) : null}

        <div className="min-h-4 flex-1" />

        <Button
          type="button"
          disabled={submitting}
          onClick={() => void handleConfirm()}
          className="mb-8 h-14 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-base font-semibold text-white shadow-lg shadow-blue-900/20 hover:bg-[var(--sf-button-hover,#1e3a8a)]"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating…
            </span>
          ) : (
            'Confirm'
          )}
        </Button>
      </div>
    </div>
  )
}
