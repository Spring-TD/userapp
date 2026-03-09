"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2, AlertTriangle, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

interface App {
  id: string
  name: string
  alias?: string
  description?: string
  status: string
}

// Helper to get token
const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  }
}

const CREATE_APP_API = process.env.NEXT_PUBLIC_CREATE_APP_SERVICE_URL || 'https://create-app-ms.fly.dev'

export default function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: appId } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [app, setApp] = useState<App | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchApp = async () => {
      try {
        // First try to get from user-specific local storage
        const storageKey = user?.id ? `springtd-apps-${user.id}` : null
        if (storageKey) {
          const savedApps = localStorage.getItem(storageKey)
          if (savedApps) {
            const apps = JSON.parse(savedApps)
            const localApp = apps.find((a: App) => a.id === appId)
            if (localApp) {
              setApp(localApp)
              setLoading(false)
              return
            }
          }
        }

        // Fallback to API call
        const response = await fetch(`${CREATE_APP_API}/api/v1/apps/${appId}`, {
          headers: getAuthHeaders(),
        })
        const data = await response.json()
        if (data.success && data.data) {
          setApp(data.data)
        }
      } catch (err) {
        console.error('Failed to fetch app:', err)
      } finally {
        setLoading(false)
      }
    }

    if (user?.id) {
      fetchApp()
    }
  }, [appId, user?.id])

  const handleDeleteApp = async () => {
    if (confirmText !== app?.name) {
      setError('Please type the app name correctly to confirm deletion')
      return
    }

    try {
      setDeleting(true)
      setError(null)

      const response = await fetch(`${CREATE_APP_API}/api/v1/apps/${appId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete app')
      }

      // Remove from user-specific local storage as well
      const storageKey = user?.id ? `springtd-apps-${user.id}` : null
      if (storageKey) {
        const savedApps = localStorage.getItem(storageKey)
        if (savedApps) {
          const apps = JSON.parse(savedApps)
          const updatedApps = apps.filter((a: App) => a.id !== appId)
          localStorage.setItem(storageKey, JSON.stringify(updatedApps))
        }
      }

      // Redirect to apps list
      router.push('/dashboard/create-app/all-apps')
    } catch (err) {
      console.error('Failed to delete app:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete app')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 bg-white p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-white p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>
      
      {/* App Info Section */}
      <div className="border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">App Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">App Name</p>
            <p className="text-gray-900 font-medium">{app?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">App ID</p>
            <p className="text-gray-900 font-mono text-sm">{appId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              app?.status === 'approved' ? 'bg-green-100 text-green-800' :
              app?.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
              app?.status === 'rejected' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {app?.status || 'draft'}
            </span>
          </div>
          {app?.alias && (
            <div>
              <p className="text-sm text-gray-500">Alias</p>
              <p className="text-gray-900">{app.alias}</p>
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border border-red-200 rounded-lg p-6 bg-red-50">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="text-red-600" size={20} />
          <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
        </div>
        
        <p className="text-sm text-red-700 mb-4">
          Deleting this app is permanent and cannot be undone. All associated data including products and configurations will be removed.
        </p>

        {!showDeleteConfirm ? (
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 size={16} className="mr-2" />
            Delete App
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="bg-white border border-red-300 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-3">
                To confirm deletion, please type the app name: <strong>{app?.name}</strong>
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type app name to confirm"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              {error && (
                <p className="text-red-600 text-sm mt-2">{error}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleDeleteApp}
                disabled={deleting || confirmText !== app?.name}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} className="mr-2" />
                    Confirm Delete
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setConfirmText("")
                  setError(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
