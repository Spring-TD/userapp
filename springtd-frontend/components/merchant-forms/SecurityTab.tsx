"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import TextInput from "@/components/TextInput"
import { DeveloperSecurityDrawer } from "@/components/DeveloperSecurityDrawer"

export function SecurityTab() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [authenticatorEnabled, setAuthenticatorEnabled] = useState(false)

  const [openDrawer, setOpenDrawer] = useState(false)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Update Security Section */}
      <div className="bg-white rounded-lg px-12 py-6 w-[80%]">
        <h3 className="text-lg font-medium mb-6">Update Security</h3>
        <div className="space-y-4">
          <TextInput placeholder="Current password" />
          <TextInput placeholder="New password" />
          <TextInput placeholder="Confirm New Password" />
          <TextInput placeholder="Enter new email" type="email" />
          <TextInput placeholder="Confirm email" type="email" />
          <Button className="w-full bg-[#7C3AED] px-6 py-6 text-white hover:bg-[#6D28D9] mt-6">
            Update
          </Button>
        </div>
      </div>

      {/* 2FA Section */}
      <div className="bg-white rounded-lg px-12 py-6 w-[80%]">
        <h3 className="text-lg font-semibold mb-6">Generate Activation key</h3>

        <div className="space-y-6">
          {/* Two Factor */}
          <div>
            <h4 className="font-medium mb-2">2FA</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Activate Two Factor Authentication</span>
              <button
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${twoFactorEnabled ? "bg-[#7C3AED]" : "bg-gray-200"
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${twoFactorEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                />
              </button>
            </div>
          </div>

          {/* Authenticator */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium">
                  Authenticator App{" "}
                  <span className="text-sm font-normal text-gray-500">TOTP</span>
                </h4>
                <p className="text-sm text-gray-500">
                  Receive a temporary one-time passcode using an app.
                </p>
              </div>
              <button
                onClick={() => setAuthenticatorEnabled(!authenticatorEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${authenticatorEnabled ? "bg-[#7C3AED]" : "bg-gray-200"
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${authenticatorEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                />
              </button>
            </div>
          </div>



          {/* Button */}
          <Button
            className="w-full bg-[#7C3AED] py-6 px-6 text-white hover:bg-[#6D28D9]"
            onClick={() => setOpenDrawer(true)}
          >
            Proceed with 2FA setup
          </Button>
        </div>
      </div>

      {/* Drawer */}
      <DeveloperSecurityDrawer open={openDrawer} onOpenChange={setOpenDrawer} />
    </div>
  )
}
