"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Loader2, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import CreateAppDrawer from "@/components/drawers/create-app-drawer"

interface App {
  id: string
  appId?: string
  name: string
  websiteUrl?: string
  alias?: string
  description?: string
  type?: string
  key?: string
  status: string
  dateCreated?: string
  createdAt?: string
}

export default function MerchantDashboardPage() {
  const router = useRouter()
  const [apps, setApps] = useState<App[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCreateAppOpen, setIsCreateAppOpen] = useState(false)

  // Fetch apps from API
  const fetchApps = useCallback(async (showRefreshToast = false) => {
    if (showRefreshToast) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

      const response = await fetch('/api/apps', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      })

      const result = await response.json()

      if (result.success && result.data) {
        // Transform API data to match our App interface
        const transformedApps: App[] = Array.isArray(result.data)
          ? result.data.map((app: any) => ({
            id: app.id || app.appId,
            appId: app.appId || app.id,
            name: app.name || 'Unnamed App',
            websiteUrl: app.websiteUrl,
            alias: app.alias,
            description: app.description,
            type: app.type || 'Mobile App',
            key: app.key || app.alias || 'N/A',
            status: app.status === 'active' ? 'Active' : (app.status === 'inactive' ? 'Inactive' : (app.status || 'Active')),
            dateCreated: app.dateCreated || (app.createdAt ? formatDate(app.createdAt) : 'N/A'),
            createdAt: app.createdAt,
          }))
          : []

        setApps(transformedApps)

        if (showRefreshToast) {
          toast.success('Apps refreshed')
        }
      } else {
        console.warn('API returned error:', result.error)
        setApps([])
        if (showRefreshToast) {
          toast.error('Failed to load apps')
        }
      }
    } catch (error) {
      console.error('Failed to fetch apps:', error)
      setApps([])
      if (showRefreshToast) {
        toast.error('Failed to refresh apps')
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  // Fetch apps on mount
  useEffect(() => {
    fetchApps()
  }, [fetchApps])

  const handleAppClick = (app: App) => {
    // Store selected app info for products page
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('selectedAppId', app.id)
      sessionStorage.setItem('selectedAppName', app.name)
    }
    router.push(`/dashboard/merchant/products/all/loan?appId=${app.id}`)
  }

  const handleRefresh = () => {
    fetchApps(true)
  }

  const handleAppCreated = (app: any) => {
    setIsCreateAppOpen(false)
    // Add the new app to the list
    setApps(prevApps => [...prevApps, {
      id: app.id || app.appId,
      appId: app.appId || app.id,
      name: app.name || 'Unnamed App',
      websiteUrl: app.websiteUrl,
      alias: app.alias,
      description: app.description,
      type: app.type || 'Mobile App',
      key: app.key || app.alias || 'N/A',
      status: 'Active',
      dateCreated: formatDate(app.createdAt || new Date().toISOString()),
      createdAt: app.createdAt || new Date().toISOString(),
    }])
    toast.success('App created successfully!')
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Apps</h1>
        <p className="text-sm text-gray-500 mt-1">View and manage your applications</p>
      </div>

      {/* Banner */}
      <div className="bg-[#48229F] rounded-2xl p-8 text-white mb-10 shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl font-bold mb-2">Manage Your Products</h2>
          <p className="text-white/80 text-sm">Click on an app to view and toggle products for your customers.</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">All Apps</h2>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreateAppOpen(true)}
            className="gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
          >
            <Plus className="h-4 w-4" />
            Create App
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border-none shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_0.8fr] gap-4 p-4 bg-[#F3F4F6] text-xs font-semibold text-gray-600 border-b border-gray-100">
          <div>App Name</div>
          <div>App ID</div>
          <div>Date Created</div>
          <div>Type</div>
          <div>Product Key</div>
          <div>Status</div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <p className="text-center">
              No apps available yet.<br />
              <span className="text-sm">Apps are created in the Product Builder dashboard.</span>
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {apps.map((app, i) => (
              <div
                key={app.id || i}
                onClick={() => handleAppClick(app)}
                className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_0.8fr] gap-4 p-5 items-center hover:bg-gray-50 cursor-pointer transition-colors"
                role="button"
              >
                <div className="font-medium text-gray-900 text-sm">{app.name}</div>
                <div className="text-gray-500 text-sm font-light truncate" title={app.id}>
                  {app.id?.slice(0, 18) || 'N/A'}...
                </div>
                <div className="text-gray-500 text-sm">{app.dateCreated}</div>
                <div className="text-gray-500 text-sm">{app.type || 'Mobile App'}</div>
                <div className="text-gray-500 text-sm">{app.key || app.alias || 'N/A'}</div>
                <div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${app.status === "Active"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-100 text-gray-600"
                      }`}
                  >
                    {app.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create App Drawer */}
      <CreateAppDrawer
        isOpen={isCreateAppOpen}
        onClose={() => setIsCreateAppOpen(false)}
        onSuccess={handleAppCreated}
      />
    </div>
  )
}
