'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, Loader2, X } from 'lucide-react'
import { MortgageSheet } from '@/components/mobile-v2/mortgage/MortgageSheet'
import {
  fetchInboxNotifications,
  formatNotificationTime,
  inboxNotificationBody,
  inboxNotificationTitle,
  markInboxNotificationRead,
  type InboxNotification,
} from '@/lib/notificationsInboxClient'

type MobileV2NotificationsSheetProps = {
  open: boolean
  onClose: () => void
  onUnreadCountChange?: (count: number) => void
}

export function MobileV2NotificationsSheet({
  open,
  onClose,
  onUnreadCountChange,
}: MobileV2NotificationsSheetProps) {
  const [notifications, setNotifications] = useState<InboxNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    const result = await fetchInboxNotifications({ limit: 20, offset: 0 })
    if (result.ok) {
      setNotifications(result.data.notifications)
      const unread = result.data.notifications.filter((item) => !item.isRead).length
      onUnreadCountChange?.(unread)
    } else {
      setNotifications([])
      onUnreadCountChange?.(0)
    }
    setLoading(false)
  }, [onUnreadCountChange])

  useEffect(() => {
    if (!open) return
    void loadNotifications()
  }, [open, loadNotifications])

  const handleMarkRead = async (notification: InboxNotification) => {
    if (notification.isRead) return
    setBusyId(notification.id)
    const result = await markInboxNotificationRead(notification.id)
    if (result.ok) {
      setNotifications((current) => {
        const next = current.map((item) =>
          item.id === notification.id ? { ...item, isRead: true, readAt: result.data.readAt } : item,
        )
        onUnreadCountChange?.(next.filter((item) => !item.isRead).length)
        return next
      })
    }
    setBusyId(null)
  }

  return (
    <MortgageSheet open={open} onClose={onClose} maxHeightClassName="max-h-[78vh] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-3 pb-4">
        <h2 className="text-lg font-bold text-[var(--sf-ink,#1E1B4B)]">Notifications</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
          aria-label="Close notifications"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--sf-button,#1E40AF)]" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-blue-200 bg-[#F8FAFF] px-5 py-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--sf-tint,#E0E7FF)] text-[var(--sf-primary,#2563EB)]">
              <Bell className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-[var(--sf-ink,#1E293B)]">No notifications yet</p>
            <p className="mx-auto mt-2 max-w-xs text-xs text-gray-500">
              Application updates and account activity will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                disabled={busyId === notification.id}
                onClick={() => void handleMarkRead(notification)}
                className={`w-full rounded-2xl border px-4 py-3 text-left shadow-sm transition-colors ${
                  notification.isRead ? 'border-gray-100 bg-white' : 'sf-border-brand border sf-accent-soft'
                }`}
              >
                <div className="flex items-start gap-2">
                  {!notification.isRead ? (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--sf-button,#1E40AF)]" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--sf-ink,#1E293B)]">
                      {inboxNotificationTitle(notification)}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">
                      {inboxNotificationBody(notification)}
                    </p>
                    <p className="mt-2 text-[11px] text-gray-400">
                      {formatNotificationTime(notification.sentAt || notification.createdAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Link
        href="/mobile-v2/notifications"
        onClick={onClose}
        className="mt-4 block w-full rounded-full bg-[var(--sf-button,#1E40AF)] py-3 text-center text-sm font-semibold text-white"
      >
        View all notifications
      </Link>
    </MortgageSheet>
  )
}
