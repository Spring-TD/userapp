import { fetchWithAuth } from "@/lib/fetchWithAuth"

export type InboxNotification = {
  id: string
  channel: "in_app"
  template: string
  status: "pending" | "sent" | "failed" | string
  createdAt: string
  sentAt?: string
  readAt: string | null
  isRead: boolean
  data: {
    inAppTitle: string
    inAppBody: string
    applicationId?: string
    productName?: string
    productType?: string
    workflowStageLabel?: string
    [key: string]: unknown
  }
}

type ApiEnvelope<T> = {
  success?: boolean
  data?: T
  error?: string
}

function parseApiEnvelope<T>(raw: unknown): ApiEnvelope<T> {
  if (typeof raw === "string") {
    return { success: false, error: raw }
  }
  if (raw && typeof raw === "object") {
    return raw as ApiEnvelope<T>
  }
  return {}
}

async function inboxFetch<T>(path: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const res = await fetchWithAuth(`/api/v1/notifications/inbox${path}`, init)
  const json = parseApiEnvelope<T>(await res.json().catch(() => ({})))
  if (!res.ok || json.success === false) {
    return { ok: false, error: json.error || `Request failed (${res.status})` }
  }
  return { ok: true, data: json.data as T }
}

export async function fetchInboxNotifications(options?: {
  limit?: number
  offset?: number
  unreadOnly?: boolean
}) {
  const qs = new URLSearchParams({
    limit: String(options?.limit ?? 50),
    offset: String(options?.offset ?? 0),
    unreadOnly: String(options?.unreadOnly ?? false),
  })
  return inboxFetch<{
    notifications: InboxNotification[]
    total: number
    limit: number
    offset: number
  }>(`?${qs.toString()}`)
}

export async function fetchInboxUnreadCount() {
  return inboxFetch<{ unreadCount: number }>("/unread-count")
}

export async function markInboxNotificationRead(id: string) {
  return inboxFetch<InboxNotification>(`/${encodeURIComponent(id)}/read`, { method: "PATCH" })
}

export async function markInboxNotificationsRead(ids?: string[]) {
  return inboxFetch<{ modifiedCount: number; readAt: string }>("/read", {
    method: "PATCH",
    body: JSON.stringify(ids?.length ? { ids } : {}),
  })
}

export async function deleteInboxNotification(id: string) {
  return inboxFetch<{ id: string; deleted: boolean }>(`/${encodeURIComponent(id)}`, { method: "DELETE" })
}

export function inboxNotificationTitle(notification: InboxNotification): string {
  return notification.data?.inAppTitle?.trim() || notification.template.replace(/[_-]+/g, " ")
}

export function inboxNotificationBody(notification: InboxNotification): string {
  return notification.data?.inAppBody?.trim() || "You have a new notification."
}

export function formatNotificationTime(value?: string | null): string {
  if (!value) return "Just now"
  const createdAt = new Date(value)
  if (Number.isNaN(createdAt.getTime())) return "Just now"
  const mins = Math.floor((Date.now() - createdAt.getTime()) / 60000)
  if (mins <= 1) return "Just now"
  if (mins < 60) return `${mins} mins ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hrs ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? "s" : ""} ago`
}
