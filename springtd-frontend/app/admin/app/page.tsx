"use client"

import { useState } from "react"
import { MoreVertical, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import SuspendProductDrawer from "@/components/drawers/suspend-product-drawer"
import SuspendAccountDrawer from "@/components/drawers/suspend-account-drawer"

export default function AdminAppPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [isSuspendDrawerOpen, setIsSuspendDrawerOpen] = useState(false)
  const router = useRouter()

  const tabs = [
    { id: "all", label: "All Apps" },
    { id: "suspended", label: "Suspended apps" },
  ]

  const apps = [
    {
      id: "1",
      name: "Name of App",
      appId: "ab2c3d4-7890-1234",
      dateCreated: "Apr 12, 2025",
      product: "Quick Money",
      productKey: "X20445-78P",
      status: "Active",
    },
    {
      id: "2",
      name: "Name of App",
      appId: "ab2c3d4-7890-1234",
      dateCreated: "Apr 12, 2025",
      product: "Quick Money",
      productKey: "X20445-78P",
      status: "Inactive",
    },
    {
      id: "3",
      name: "Name of App",
      appId: "ab2c3d4-7890-1234",
      dateCreated: "Apr 11, 2025",
      product: "Quick Money",
      productKey: "X20445-78P",
      status: "Active",
    },
    {
      id: "4",
      name: "Name of App",
      appId: "ab2c3d4-7890-1234",
      dateCreated: "Apr 11, 2025",
      product: "Quick Money",
      productKey: "X20445-78P",
      status: "Inactive",
    },
  ]

  const handleSelectApp = (appId: string) => {
    setSelectedApps((prev) => (prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]))
  }

  const handleSuspendApps = () => {
    setIsSuspendDrawerOpen(true)
  }

  const handleDeactivate = () => {
    // Handle deactivation logic
    setIsSuspendDrawerOpen(false)
    setSelectedApps([])
  }

  return (
    <div className="flex-1 bg-white">
      <div className="border-b border-gray-200 px-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id ? "text-[#4169E1]" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4169E1]" />}
              </button>
            ))}
          </div>
          {activeTab === "suspended" && (
            <Button
              onClick={handleSuspendApps}
              disabled={selectedApps.length === 0}
              className="bg-[#4169E1] text-white hover:bg-[#3557c7] gap-2 disabled:opacity-50 mb-4"
            >
              <X size={16} />
              Suspend Apps
            </Button>
          )}
        </div>
      </div>

      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {activeTab === "suspended" ? "Suspended Apps" : "Product Transactions"}
          </h2>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F5F5F5]">
              <tr>
                {activeTab === "suspended" && (
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700 w-12"></th>
                )}
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">App Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">App ID</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Date Created</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Product</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Product Key</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {apps.map((app) => (
                <tr
                  key={app.id}
                  onClick={() => {
                    if (activeTab === "all") {
                      router.push(`/admin/app/${app.id}`)
                    }
                  }}
                  className={activeTab === "all" ? "hover:bg-gray-50 cursor-pointer" : "hover:bg-gray-50"}
                >
                  {activeTab === "suspended" && (
                    <td className="px-6 py-4">
                      <input
                        type="radio"
                        name="selectedApp"
                        checked={selectedApps.includes(app.id)}
                        onChange={() => handleSelectApp(app.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-900">{app.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{app.appId}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{app.dateCreated}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{app.product}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{app.productKey}</td>
                  <td className="px-6 py-4">
                    {activeTab === "all" ? (
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            app.status === "Active" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {app.status}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <MoreVertical size={20} />
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          app.status === "Active" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {app.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SuspendProductDrawer
        isOpen={isSuspendDrawerOpen}
        onClose={() => setIsSuspendDrawerOpen(false)}
        onDeactivate={handleDeactivate}
      />
      <SuspendAccountDrawer isOpen={isSuspendDrawerOpen} onClose={() => setIsSuspendDrawerOpen(false)} />
    </div>
  )
}
