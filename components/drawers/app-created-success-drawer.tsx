"use client"

import { CheckCircle, X } from "lucide-react"

interface AppCreatedSuccessDrawerProps {
  isOpen: boolean
  onClose: () => void
  app: any
}

export default function AppCreatedSuccessDrawer({ isOpen, onClose, app }: AppCreatedSuccessDrawerProps) {
  if (!isOpen || !app) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">App Created Successfully!</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-md hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            "{app.name}" has been created!
          </h3>

          <p className="text-gray-600 mb-6">
            Your application is now ready. You can start managing it right away.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">App ID:</span>
                <span className="font-medium">{app.appId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Website:</span>
                <span className="font-medium text-blue-600">{app.websiteUrl}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  {app.status}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-[#7C3AED] text-white rounded-md hover:bg-[#6D28D9]"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
