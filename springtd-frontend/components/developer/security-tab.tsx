"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import TextInput from "@/components/text-input"

interface SecurityTabProps {
  onProceed2FA: () => void
}

export function SecurityTab({ onProceed2FA }: SecurityTabProps) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [authenticatorEnabled, setAuthenticatorEnabled] = useState(false)
  const [smsEnabled, setSmsEnabled] = useState(false)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium mb-6">Update Security</h3>
        <div className="space-y-4">
          <TextInput placeholder="Current password" type="password" accentColor="#9A813F" />
          <TextInput placeholder="New password" type="password" accentColor="#9A813F" />
          <TextInput placeholder="Confirm New Password" type="password" accentColor="#9A813F" />
          <TextInput placeholder="Enter new email" type="email" accentColor="#9A813F" />
          <TextInput placeholder="confirm email" type="email" accentColor="#9A813F" />
          <div className="flex justify-center">
            <Button className="max-w-xs w-full bg-black text-white hover:bg-gray-800 mt-6">Update</Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium mb-6">Generate Activation key</h3>

        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-2">2FA</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Activate Two Factor Authentication</span>
              <button
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  twoFactorEnabled ? "bg-[#9A813F]" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    twoFactorEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium">
                  Authenticator App <span className="text-sm font-normal text-gray-500">TOTP</span>
                </h4>
                <p className="text-sm text-gray-500">Receive a temporary one time-passcode using an app.</p>
              </div>
              <button
                onClick={() => setAuthenticatorEnabled(!authenticatorEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  authenticatorEnabled ? "bg-[#9A813F]" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    authenticatorEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-medium">
                  Text Message <span className="text-sm font-normal text-gray-500">SMS</span>
                </h4>
                <p className="text-sm text-gray-500">Get a one-time passcode through text message</p>
              </div>
              <button
                onClick={() => setSmsEnabled(!smsEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  smsEnabled ? "bg-[#9A813F]" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    smsEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex justify-center">
            <Button className="max-w-xs w-full bg-black text-white hover:bg-gray-800" onClick={onProceed2FA}>
              Proceed with 2FA setup
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
