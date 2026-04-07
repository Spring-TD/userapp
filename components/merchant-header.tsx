"use client"

import { useEffect } from "react"
import { Bell, User, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { usePathname, useRouter } from "next/navigation"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchMerchantAppsThunk, setSelectedMerchantApp } from "@/store/merchantAppsSlice"
import { buildMerchantProductsUrl } from "@/lib/merchantAppNavigation"

interface MerchantHeaderProps {
  breadcrumb?: React.ReactNode
}

export default function MerchantHeader({ breadcrumb }: MerchantHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const { apps, loading, selectedAppId, selectedAppName, fetchAttempted } = useAppSelector((s) => s.merchantApps)

  useEffect(() => {
    if (fetchAttempted) return
    void dispatch(fetchMerchantAppsThunk())
  }, [dispatch, fetchAttempted])

  const displayName =
    selectedAppName ||
    apps.find((a) => a.id === selectedAppId)?.name ||
    (apps.length === 0 ? "No apps" : "Select app")

  const handleSelectApp = (id: string, name: string) => {
    dispatch(setSelectedMerchantApp({ id, name }))
    router.push(buildMerchantProductsUrl(pathname, id))
  }

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          onClick={() => router.push("/dashboard/merchant")}
          type="button"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={loading || apps.length === 0}
                className="bg-[#7C3AED] text-white hover:bg-[#6D28D9] hover:text-white border-none disabled:opacity-60"
                type="button"
              >
                {loading ? (
                  <Skeleton className="h-9 min-w-[140px] rounded-md bg-white/25" aria-hidden />
                ) : (
                  <>
                    {displayName}
                    <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
              {apps.map((app) => (
                <DropdownMenuItem
                  key={app.id}
                  onSelect={() => handleSelectApp(app.id, app.name)}
                  className={app.id === selectedAppId ? "bg-violet-50" : undefined}
                >
                  {app.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {breadcrumb && <div className="text-sm flex items-center">{breadcrumb}</div>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button type="button" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Bell size={20} className="text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#7C3AED] rounded-full" />
        </button>
        <button type="button" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <User size={20} className="text-gray-600" />
        </button>
      </div>
    </header>
  )
}
