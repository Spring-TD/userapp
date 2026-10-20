'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X } from 'lucide-react'

interface CreateRoleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateRoleModal({ isOpen, onClose, onSuccess }: CreateRoleModalProps) {
  const [roleName, setRoleName] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  const [permission, setPermission] = useState('')

  const handleSubmit = () => {
    if (roleName && roleDescription && permission) {
      onSuccess()
      setRoleName('')
      setRoleDescription('')
      setPermission('')
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

          <div className="p-8">
            <h2 className="text-2xl font-bold mb-2">Create Role</h2>
            <p className="text-sm text-gray-600 mb-8">Upload company documents</p>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="roleName">Name of role</Label>
                <Input
                  id="roleName"
                  placeholder="Name of role"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="roleDescription">Role Description</Label>
                <Textarea
                  id="roleDescription"
                  placeholder="Role Description"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  className="min-h-[150px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="permission">Select permission</Label>
                <Select value={permission} onValueChange={setPermission}>
                  <SelectTrigger id="permission">
                    <SelectValue placeholder="Select permission" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Access</SelectItem>
                    <SelectItem value="read">Read Only</SelectItem>
                    <SelectItem value="write">Write Access</SelectItem>
                    <SelectItem value="admin">Admin Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSubmit} className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
                Create Role
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
