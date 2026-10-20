"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchInboxUnreadCount } from "@/lib/notificationsInboxClient"

export function useInboxUnreadCount(): [number, (count: number) => void] {
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(async () => {
    const result = await fetchInboxUnreadCount()
    if (result.ok) {
      setUnreadCount(result.data.unreadCount)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return [unreadCount, setUnreadCount]
}
