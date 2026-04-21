"use client"

import { Bell, User, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/useAuth"

type NotificationItem = {
  id: string
  title: string
  time: string
}

const SPRING_NOTIFICATIONS: NotificationItem[] = [
  { id: "n1", title: "New customer onboard", time: "Just now" },
  { id: "n2", title: "Product creation successful", time: "5 mins ago" },
  { id: "n3", title: "Customer KYC completed", time: "12 mins ago" },
  { id: "n4", title: "Withdrawal alert", time: "18 mins ago" },
  { id: "n5", title: "New support ticket", time: "25 mins ago" },
]

interface DashboardTopRightControlsProps {
  iconClassName?: string
}

export function DashboardTopRightControls({ iconClassName = "text-gray-600" }: DashboardTopRightControlsProps) {
  const router = useRouter()
  const { user, logout } = useAuth()

  const unreadCount = SPRING_NOTIFICATIONS.length
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "User"

  const handleLogout = async () => {
    await logout()
    toast.success("Logged out successfully")
    router.replace("/signin")
  }

  return (
    <div className="flex items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Open notifications">
            <Bell size={20} className={iconClassName} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#7C3AED] px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SPRING_NOTIFICATIONS.map((item) => (
            <DropdownMenuItem key={item.id} className="flex flex-col items-start gap-0.5 py-2">
              <span className="text-sm text-gray-900">{item.title}</span>
              <span className="text-xs text-gray-500">{item.time}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Open account menu">
            <User size={20} className={iconClassName} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600" onSelect={() => void handleLogout()}>
            <LogOut size={16} />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

