"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, ExternalLink } from "lucide-react"
import CreateAppDrawer from "@/components/drawers/create-app-drawer"
import { useAuth } from "@/hooks/useAuth"

export default function AllAppsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isCreateAppOpen, setIsCreateAppOpen] = useState(false)
  const [apps, setApps] = useState<any[]>([])

  // Get user-specific storage key
  const getStorageKey = () => {
    if (user?.id) {
      return `springtd-apps-${user.id}`
    }
    return null
  }

  // Load apps from localStorage when user is available
  useEffect(() => {
    const storageKey = getStorageKey()
    if (storageKey && typeof window !== 'undefined') {
      const savedApps = localStorage.getItem(storageKey)
      setApps(savedApps ? JSON.parse(savedApps) : [])
    }
  }, [user?.id])

  // Save apps to localStorage whenever apps change
  useEffect(() => {
    const storageKey = getStorageKey()
    if (storageKey && typeof window !== 'undefined' && apps.length >= 0) {
      localStorage.setItem(storageKey, JSON.stringify(apps))
    }
  }, [apps, user?.id])

  const handleAppCreated = (app: any) => {
    setIsCreateAppOpen(false)
    setApps(prevApps => [...prevApps, app])
  }

  const handleAppClick = (appId: string) => {
    router.push(`/dashboard/create-app/all-apps/${appId}/wallets/treasury`)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Applications</h1>
          <p className="text-gray-600 mt-1">Create and manage your microservice applications</p>
        </div>
        <Button
          onClick={() => setIsCreateAppOpen(true)}
          className="bg-[#9A813F] text-white hover:bg-[#8a7435]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Application
        </Button>
      </div>

      {/* Info Banner */}
      <div className="mb-8">
        <div className="bg-[#F5F1E8] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Create your Application</h2>
          <p className="text-sm text-gray-600">Start by creating your app or you can integrate our in-app widget.</p>
        </div>
      </div>

      {/* Apps Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {apps.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Plus className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first application</p>
            <Button
              onClick={() => setIsCreateAppOpen(true)}
              className="bg-[#9A813F] text-white hover:bg-[#8a7435]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First App
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Application Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">App ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Website URL</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Alias</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Date Created</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {apps.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{app.name}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{app.appId}</td>
                    <td className="py-3 px-4">
                      <a
                        href={app.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#9A813F] hover:underline flex items-center gap-1"
                      >
                        {app.websiteUrl}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{app.alias}</td>
                    <td className="py-3 px-4 text-gray-600">{app.dateCreated}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleAppClick(app.id)}
                        className="text-[#9A813F] hover:underline text-sm font-medium"
                      >
                        Open App
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
