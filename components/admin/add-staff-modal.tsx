'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { X, UserCircle, Plus } from 'lucide-react'

interface AddStaffModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (email: string) => void
}

export function AddStaffModal({ isOpen, onClose, onSuccess }: AddStaffModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('admin')

  const handleSubmit = () => {
    if (email) {
      onSuccess(email)
      setEmail('')
      setRole('admin')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center p-8">
            <div className="w-16 h-16 rounded-full bg-[#2563EB]/10 flex items-center justify-center mb-4">
              <UserCircle className="w-8 h-8 text-[#2563EB]" />
            </div>
            <h2 className="text-2xl font-bold mb-8">Add Staff</h2>

            <div className="w-full space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Staff Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter staff email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <Label>Select Role</Label>
                <RadioGroup value={role} onValueChange={setRole}>
                  <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="admin" id="admin" />
                    <Label htmlFor="admin" className="cursor-pointer flex-1">
                      Admin
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="manager" id="manager" />
                    <Label htmlFor="manager" className="cursor-pointer flex-1">
                      Manager
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="support" id="support" />
                    <Label htmlFor="support" className="cursor-pointer flex-1">
                      Support
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="customer" id="customer" />
                    <Label htmlFor="customer" className="cursor-pointer flex-1">
                      Customer
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={() => {
                  // Add another invite functionality
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Send another invite
              </Button>

              <Button onClick={handleSubmit} className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
                Invite
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
