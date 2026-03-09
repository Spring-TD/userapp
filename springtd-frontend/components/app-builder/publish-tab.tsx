"use client"

import { Button } from "@/components/ui/button"
import { MoreVertical, RotateCcw, Loader2, Clock, CheckCircle2, Upload, AlertCircle, RefreshCw } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAppBuilder } from "@/contexts/AppBuilderContext"
import { useState, useEffect } from "react"
import { appConfigurationApi, type AppConfiguration } from "@/lib/appService"
import { toast } from "sonner"
import { format, formatDistanceToNow } from "date-fns"

interface ConfigVersion {
  id: string
  versionRef: string
  updatedSections: string[]
  lastUpdated: Date
  status: 'draft' | 'current' | 'archived'
  isPublished?: boolean
}

export function PublishTab() {
  const { 
    appId, 
    hasUnsavedChanges, 
    isLoading,
    publishConfiguration,
    restoreConfiguration,
    getChangedSections,
  } = useAppBuilder()
  
  const [versions, setVersions] = useState<ConfigVersion[]>([])
  const [loadingVersions, setLoadingVersions] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [versionToRestore, setVersionToRestore] = useState<ConfigVersion | null>(null)

  // Fetch configuration versions
  const fetchVersions = async () => {
    if (!appId) {
      setLoadingVersions(false)
      return
    }
    
    setLoadingVersions(true)
    
    try {
      const response = await appConfigurationApi.getAllConfigurations(appId)
      const configs = response.data || []
      
      // Transform configurations to versions
      const transformedVersions: ConfigVersion[] = configs.map((config: AppConfiguration, index: number) => ({
        id: config.id || `version-${index}`,
        versionRef: `App_v${configs.length - index}_${(config.id || '').slice(-6) || Math.random().toString(36).slice(-6)}`,
        updatedSections: getUpdatedSectionsFromConfig(config),
        lastUpdated: config.updatedAt ? new Date(config.updatedAt) : new Date(),
        status: config.isActive ? 'current' : 'archived' as const,
        isPublished: config.isActive,
      }))
      
      setVersions(transformedVersions)
    } catch (error) {
      console.error("Failed to fetch versions:", error)
      toast.error("Failed to load version history")
    } finally {
      setLoadingVersions(false)
    }
  }

  useEffect(() => {
    fetchVersions()
  }, [appId])

  function getUpdatedSectionsFromConfig(config: AppConfiguration): string[] {
    const sections: string[] = []
    if (config.appElements?.logo || config.appElements?.splash) sections.push('Assets')
    if (config.appElements?.buttons) sections.push('Splash')
    if (config.onboarding?.splash1 || config.onboarding?.splash2) sections.push('Onboarding')
    if (config.appProfile?.elementColors) sections.push('Profile')
    if (config.dns?.customDomain) sections.push('DNS')
    if (config.policy?.termsSection?.content || config.policy?.policySection?.content) sections.push('Policy')
    if (config.support?.email || config.support?.phone) sections.push('Support')
    return sections.length > 0 ? sections : ['Initial']
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const result = await publishConfiguration()
      
      if (result.success) {
        toast.success("🚀 Configuration published successfully!", {
          description: "Your app changes are now live.",
        })
        
        // Refresh the version list
        await fetchVersions()
      } else {
        toast.error("Failed to publish configuration")
      }
    } catch (error) {
      toast.error("Failed to publish configuration")
    } finally {
      setPublishing(false)
    }
  }

  const handleRestoreClick = (version: ConfigVersion) => {
    setVersionToRestore(version)
    setRestoreDialogOpen(true)
  }

  const handleRestoreConfirm = async () => {
    if (!versionToRestore) return
    
    setRestoreDialogOpen(false)
    setRestoring(versionToRestore.id)
    
    try {
      const result = await restoreConfiguration(versionToRestore.id)
      
      if (result.success) {
        toast.success("✅ Version restored successfully!", {
          description: `Restored to ${versionToRestore.versionRef}`,
        })
        
        // Refresh version list
        await fetchVersions()
      } else {
        toast.error("Failed to restore version")
      }
    } catch (error) {
      toast.error("Failed to restore version")
    } finally {
      setRestoring(null)
      setVersionToRestore(null)
    }
  }

  const formatLastUpdated = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true })
  }

  const formatDate = (date: Date) => {
    return format(date, 'MMM dd, yyyy • HH:mm')
  }

  const currentVersion = versions.find(v => v.status === 'current')
  const archivedVersions = versions.filter(v => v.status === 'archived')
  const changedSections = getChangedSections()

  if (isLoading || loadingVersions) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
          <p className="text-sm text-gray-500">Loading version history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Publish & Version Control</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your app configuration versions and publish changes
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchVersions}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Publish New Version Card */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#7C3AED] flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {hasUnsavedChanges ? 'Ready to Publish' : 'All Changes Published'}
                </h3>
                <p className="text-sm text-gray-500">
                  {hasUnsavedChanges 
                    ? 'You have unpublished changes ready to go live' 
                    : 'Your app configuration is up to date'
                  }
                </p>
              </div>
            </div>

            {hasUnsavedChanges && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Changes to publish:</p>
                <div className="flex flex-wrap gap-2">
                  {changedSections.map((section) => (
                    <span 
                      key={section} 
                      className="px-3 py-1.5 bg-white border border-purple-200 text-purple-700 text-xs rounded-full font-medium shadow-sm"
                    >
                      {section}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handlePublish}
            disabled={publishing || !hasUnsavedChanges}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white gap-2 px-6 disabled:opacity-50"
          >
            {publishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Publish Now
              </>
            )}
          </Button>
        </div>

        {!hasUnsavedChanges && !currentVersion && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <p className="font-medium">No configuration saved yet</p>
              <p className="mt-1">Make changes in the other tabs and come back here to publish.</p>
            </div>
          </div>
        )}
      </div>

      {/* Version History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Version History</h3>
        
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Version</th>
                <th className="px-6 py-4">Sections Updated</th>
                <th className="px-6 py-4">Published</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Current Version */}
              {currentVersion && (
                <tr className="bg-green-50/50">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-gray-900">{currentVersion.versionRef}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex gap-2 flex-wrap">
                      {currentVersion.updatedSections.map((section) => (
                        <span 
                          key={section} 
                          className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium"
                        >
                          {section}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div>
                      <p className="text-gray-900 font-medium">{formatLastUpdated(currentVersion.lastUpdated)}</p>
                      <p className="text-xs text-gray-500">{formatDate(currentVersion.lastUpdated)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      Live
                    </span>
                  </td>
                  <td className="px-6 py-5"></td>
                </tr>
              )}
              
              {/* Archived Versions */}
              {archivedVersions.map((version) => (
                <tr key={version.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-700">{version.versionRef}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex gap-2 flex-wrap">
                      {version.updatedSections.map((section) => (
                        <span 
                          key={section} 
                          className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs rounded-full font-medium"
                        >
                          {section}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div>
                      <p className="text-gray-700">{formatLastUpdated(version.lastUpdated)}</p>
                      <p className="text-xs text-gray-400">{formatDate(version.lastUpdated)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-xs font-medium">
                      Archived
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button 
                          className="p-2 hover:bg-gray-100 rounded-lg border border-gray-200 bg-white transition-colors disabled:opacity-50"
                          disabled={restoring === version.id}
                        >
                          {restoring === version.id ? (
                            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                          ) : (
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem 
                          className="gap-2 cursor-pointer"
                          onClick={() => handleRestoreClick(version)}
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restore this version
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              
              {/* Empty state */}
              {versions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">No versions yet</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Configure your app and publish to create your first version.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Previous Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore your app configuration to <strong>{versionToRestore?.versionRef}</strong> from {versionToRestore && formatDate(versionToRestore.lastUpdated)}.
              <br /><br />
              Your current configuration will be archived and can be restored later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRestoreConfirm}
              className="bg-[#7C3AED] hover:bg-[#6D28D9]"
            >
              Restore Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
