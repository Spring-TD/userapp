'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { MobileV2NotificationsSheet } from '@/components/mobile-v2/MobileV2NotificationsSheet'
import { useInboxUnreadCount } from '@/hooks/useInboxUnreadCount'

type MobileV2NotificationBellProps = {
  className?: string
}

export function MobileV2NotificationBell({ className }: MobileV2NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useInboxUnreadCount()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          'relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--sf-tint,#E0E7FF)] text-[var(--sf-primary,#2563EB)]'
        }
        aria-label="Open notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      <MobileV2NotificationsSheet
        open={open}
        onClose={() => setOpen(false)}
        onUnreadCountChange={setUnreadCount}
      />
    </>
  )
}
