"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, ExternalLink } from "lucide-react"
import CreateAppDrawer from "@/components/drawers/create-app-drawer"
import { useAuth } from "@/hooks/useAuth"

export default function CreateAppPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isCreateAppOpen, setIsCreateAppOpen] = useState(false)
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch apps from API
  useEffect(() => {
    const fetchApps = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem("accessToken")
        const response = await fetch("/api/apps?source=spring-app", {
          headers: {
            "Content-Type": "application/json",
            ...(token && { "Authorization": `Bearer ${token}` })
          }
        })

        const result = await response.json()

        if (result.success && result.data) {
          setApps(result.data)
        }
      } catch (error) {
        console.error("Error fetching apps:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchApps()
  }, [])

  const handleAppCreated = (app: any) => {
    setIsCreateAppOpen(false)
    setApps(prevApps => [...prevApps, app])
  }

  const handleAppClick = (appId: string) => {
    router.push(`/dashboard/create-app/all-apps/${appId}/products/overview`)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="flex-1 bg-white">
      {/* Info Banner */}
      <div className="px-8 pt-6 pb-4">
        <div className="bg-[#F5F1E8] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Create your Application</h2>
          <p className="text-sm text-gray-600">Start by creating your app or you can integrate our in-app widget.</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">All Apps</h2>
          <Button
            onClick={() => setIsCreateAppOpen(true)}
            className="bg-black text-white hover:bg-gray-800 gap-2"
          >
            <Plus size={16} />
            Create App
          </Button>
        </div>

        {/* Apps Table */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading apps...</p>
          </div>
        ) : apps.length === 0 ? (
          <div className="border border-gray-200 rounded-lg p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Plus className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first application</p>
            <Button
              onClick={() => setIsCreateAppOpen(true)}
              className="bg-black text-white hover:bg-gray-800 gap-2"
            >
              <Plus size={16} />
              Create Your First App
            </Button>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#F5F5F5]">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">App Name</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">App ID</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Website URL</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Alias</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Date Created</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {apps.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => handleAppClick(app.id)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{app.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{app.appId || app.id}</td>
                    <td className="px-6 py-4 text-sm">
                      <a
                        href={app.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#9A813F] hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {app.websiteUrl}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{app.alias}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(app.createdAt || app.dateCreated)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
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
