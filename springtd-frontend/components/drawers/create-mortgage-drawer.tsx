"use client"

import { useState } from "react"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import TextInput from "@/components/text-input"
import InputGroup from "@/components/input-group"

interface CreateMortgageDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  onBack?: () => void
  accentColor?: string
}

export default function CreateMortgageDrawer({ isOpen, onClose, onSubmit, onBack, accentColor = "#9A813F" }: CreateMortgageDrawerProps) {
  const [productName, setProductName] = useState("")
  const [description, setDescription] = useState("")
  const [productType, setProductType] = useState("")

  const handleSubmit = () => {
    onSubmit({ productName, description, productType })
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onClose}
      title="Creating your mortgage"
      subtitle="Select the mortgage product you want to create with us"
    >
      <div className="space-y-4">
        <TextInput
          label="Name of product (mortgage)"
          placeholder="Name of product (mortgage)"
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
          options={["Fixed Rate Mortgage", "Adjustable Rate Mortgage", "FHA Loan", "VA Loan"]}
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
            Create mortgage
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
