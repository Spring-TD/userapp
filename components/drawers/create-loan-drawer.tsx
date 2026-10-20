"use client"

import { useEffect, useState } from "react"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import TextInput from "@/components/text-input"
import InputGroup from "@/components/input-group"

interface CreateLoanDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  onBack?: () => void
  accentColor?: string
}

export default function CreateLoanDrawer({ isOpen, onClose, onSubmit, onBack, accentColor = "#9A813F" }: CreateLoanDrawerProps) {
  const [productName, setProductName] = useState("")
  const [description, setDescription] = useState("")
  const [productType, setProductType] = useState("")
  const [subtypeOptions, setSubtypeOptions] = useState<string[]>([])

  useEffect(() => {
    if (!isOpen) return

    const fetchSubtypes = async () => {
      try {
        const res = await fetch("/api/v1/products/types/Loan/subtypes", {
          credentials: "include",
        })
        const json = await res.json()
        const list = (json?.data ?? []) as { value?: string; label?: string }[]
        const normalized =
          Array.isArray(list) && list.length
            ? list
                .map((x) => x.label || x.value)
                .filter((v): v is string => typeof v === "string" && v.length > 0)
            : []
        if (normalized.length) {
          setSubtypeOptions(normalized)
        }
      } catch {
        // keep default options on failure
      }
    }

    fetchSubtypes()
  }, [isOpen])

  const handleSubmit = () => {
    onSubmit({ productName, description, productType })
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onClose}
      title="Creating your loan"
      subtitle="Select the loan product you want to create with us"
    >
      <div className="space-y-4">
        <TextInput
          label="Name of product (loan)"
          placeholder="Name of product (loan)"
          value={productName}
          onChange={setProductName}
          accentColor={accentColor}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description of product</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description of product"
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent resize-none"
            style={{ "--tw-ring-color": accentColor } as any}
          />
        </div>

        <InputGroup
          label="Product Type"
          placeholder="Product Type"
          options={subtypeOptions}
          value={productType}
          onChange={setProductType}
          accentColor={accentColor}
        />

        <div className="flex gap-3 mt-6">
          {onBack && (
            <Button
              onClick={onBack}
              variant="outline"
              className="flex-1 h-12 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!productName || !description || !productType}
            className="flex-1 h-12 text-white"
            style={{ backgroundColor: accentColor }}
          >
            Create loan
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
