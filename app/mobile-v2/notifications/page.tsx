"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Bell, CheckCheck, ChevronLeft, Loader2, Trash2 } from "lucide-react"
import { MobileV2BottomNav } from "@/components/mobile-v2/MobileV2BottomNav"
import {
  deleteInboxNotification,
  fetchInboxNotifications,
  fetchInboxUnreadCount,
  formatNotificationTime,
  inboxNotificationBody,
  inboxNotificationTitle,
  markInboxNotificationRead,
  markInboxNotificationsRead,
  type InboxNotification,
} from "@/lib/notificationsInboxClient"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<InboxNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [inboxResult, countResult] = await Promise.all([
      fetchInboxNotifications({ limit: 50, offset: 0 }),
      fetchInboxUnreadCount(),
    ])

    if (!inboxResult.ok) {
      setError(null)
      setNotifications([])
    } else {
      setNotifications(inboxResult.data.notifications)
    }

    if (countResult.ok) {
      setUnreadCount(countResult.data.unreadCount)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  const handleMarkRead = async (notification: InboxNotification) => {
    if (notification.isRead) return
    setBusyId(notification.id)
    const result = await markInboxNotificationRead(notification.id)
    if (result.ok) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, isRead: true, readAt: result.data.readAt } : item,
        ),
      )
      setUnreadCount((count) => Math.max(0, count - 1))
    }
    setBusyId(null)
  }

  const handleMarkAllRead = async () => {
    setBusyId("all")
    const result = await markInboxNotificationsRead()
    if (result.ok) {
      const readAt = result.data.readAt
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true, readAt })))
      setUnreadCount(0)
    }
    setBusyId(null)
  }

  const handleDelete = async (id: string) => {
    setBusyId(id)
    const result = await deleteInboxNotification(id)
    if (result.ok) {
      setNotifications((current) => current.filter((item) => item.id !== id))
      setUnreadCount((count) => {
        const deleted = notifications.find((item) => item.id === id)
        return deleted && !deleted.isRead ? Math.max(0, count - 1) : count
      })
    }
    setBusyId(null)
  }

  return (
    <div className="flex min-h-full flex-col bg-[#FAFAFA]">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between px-5 pt-12">
          <Link
            href="/mobile-v2/home"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-bold text-[var(--sf-ink,#1E293B)]">Notifications</h1>
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={busyId === "all" || unreadCount === 0}
            className="text-xs font-semibold text-[var(--sf-button,#1E40AF)] disabled:opacity-40"
          >
            Mark all read
          </button>
        </div>

        <div className="px-5 pt-4">
          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--sf-button,#1E40AF)]" />
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-red-50 px-4 py-6 text-center text-sm text-red-600">{error}</div>
          ) : notifications.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-blue-200 bg-white px-6 py-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--sf-tint,#E0E7FF)] text-[var(--sf-primary,#2563EB)]">
                <Bell className="h-7 w-7" />
              </div>
              <h2 className="text-base font-bold text-[var(--sf-ink,#1E1B4B)]">No notifications yet</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm text-gray-500">
                Application updates and account activity will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void handleMarkRead(notification)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left shadow-sm transition-colors ${
                    notification.isRead ? "border-gray-100 bg-white" : "border-blue-100 bg-[#EFF6FF]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {!notification.isRead ? (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--sf-button,#1E40AF)]" />
                        ) : null}
                        <p className="truncate text-sm font-semibold text-[var(--sf-ink,#1E293B)]">
                          {inboxNotificationTitle(notification)}
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">
                        {inboxNotificationBody(notification)}
                      </p>
                      <p className="mt-3 text-[11px] text-gray-400">
                        {formatNotificationTime(notification.sentAt || notification.createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Delete notification"
                      disabled={busyId === notification.id}
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleDelete(notification.id)
                      }}
                      className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                    >
                      {busyId === notification.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <MobileV2BottomNav active="home" />
    </div>
  )
}
