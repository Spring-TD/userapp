"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, AlertTriangle } from "lucide-react"
import ScamAlertConfirmationDrawer from "@/components/drawers/scam-alert-confirmation-drawer"
import ScamAlertEmailDrawer from "@/components/drawers/scam-alert-email-drawer"

export default function ScamAlertPage() {
  const [step, setStep] = useState(0) // 0: initial, 1: confirmation, 2: email
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isEmailDrawerOpen, setIsEmailDrawerOpen] = useState(false)

  const apps = [
    {
      name: "Name of App",
      appId: "ab2c3d4-7890-1234",
      dateCreated: "Apr 12, 2025",
      product: "Quick Money",
      productKey: "X20445-78P",
      status: "Active",
    },
    {
      name: "Name of App",
      appId: "ab2c3d4-7890-1234",
      dateCreated: "Apr 12, 2025",
      product: "Quick Money",
      productKey: "X20445-78P",
      status: "Inactive",
    },
    {
      name: "Name of App",
      appId: "ab2c3d4-7890-1234",
      dateCreated: "Apr 11, 2025",
      product: "Quick Money",
      productKey: "X20445-78P",
      status: "Active",
    },
    {
      name: "Name of App",
      appId: "ab2c3d4-7890-1234",
      dateCreated: "Apr 11, 2025",
      product: "Quick Money",
      productKey: "X20445-78P",
      status: "Inactive",
    },
  ]

  const handleNext = () => {
    if (step === 0) {
      setStep(1)
      setIsConfirmationOpen(true)
    } else if (step === 1) {
      setStep(2)
      setIsConfirmationOpen(false)
      setIsEmailDrawerOpen(true)
    } else {
      setStep(0)
      setIsEmailDrawerOpen(false)
    }
  }

  const handleAlertClick = () => {
    setIsConfirmationOpen(true)
  }

  const handleConfirmationYes = () => {
    setIsConfirmationOpen(false)
    setIsEmailDrawerOpen(true)
  }

  const handleDeactivate = (email: string) => {
    console.log("[v0] Deactivating account with email:", email)
    setIsEmailDrawerOpen(false)
  }

  return (
    <div className="flex-1 bg-white">
      <div className="px-8 pt-6 pb-4">
        <div className="flex items-center justify-end gap-4">
          <Button onClick={handleNext} variant="outline" className="gap-2 bg-transparent">
            Next
          </Button>
          <button
            onClick={handleAlertClick}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <AlertTriangle size={20} />
            <span className="text-sm font-medium">Under attack? Click here</span>
          </button>
        </div>
      </div>

      <div className="px-8 pb-8">
        <div className="border-2 border-red-500 rounded-lg p-6">
          {/* Welcome section */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Welcome</h1>
            <p className="text-sm text-gray-600">Our application platform</p>
          </div>

          {/* Create your Application info box */}
          <div className="bg-[#F5F1E8] rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Create your Application</h2>
            <p className="text-sm text-gray-600">start by creating your app or you can integrate our in-app widget.</p>
          </div>

          {/* All App heading with create button */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">All App</h2>
            <Button className="bg-black text-white hover:bg-gray-800 gap-2">
              <Plus size={16} />
              create app
            </Button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden mt-6">
          <table className="w-full">
            <thead className="bg-[#F5F5F5]">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">App Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">App ID</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Date Created</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Product</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Product Key</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {apps.map((app, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{app.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{app.appId}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{app.dateCreated}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{app.product}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{app.productKey}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        app.status === "Active" ? "bg-[#F5F1E8] text-[#9A813F]" : "bg-[#FFF3D3] text-[#B8860B]"
                      }`}
                    >
                      {app.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ScamAlertConfirmationDrawer
        open={isConfirmationOpen}
        onOpenChange={setIsConfirmationOpen}
        onConfirm={handleConfirmationYes}
      />
      <ScamAlertEmailDrawer open={isEmailDrawerOpen} onOpenChange={setIsEmailDrawerOpen} onSubmit={handleDeactivate} />
    </div>
  )
}
