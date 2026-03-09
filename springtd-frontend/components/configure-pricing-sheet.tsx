"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Drawer } from "@/components/drawer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ConfigurePricingSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConfigurePricingSheet({ open, onOpenChange }: ConfigurePricingSheetProps) {
  return (
    <Drawer 
      open={open} 
      onOpenChange={onOpenChange}
      title="Configure Pricing"
      subtitle="Manage how much your users get charged for configure pricing"
      className="w-[40%] min-w-[500px]"
    >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="pricing-type" className="font-normal text-gray-700">Select Pricing Type</Label>
            <Select>
              <SelectTrigger id="pricing-type" className="!h-14 border-[#E2E8F0] bg-white rounded-xl w-full">
                <SelectValue placeholder="" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flat">Flat Rate</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pricing-condition" className="font-normal text-gray-700">Select Pricing Condition</Label>
            <Select>
              <SelectTrigger id="pricing-condition" className="!h-14 border-[#E2E8F0] bg-white rounded-xl w-full">
                <SelectValue placeholder="" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="upper-cap" className="font-normal text-gray-700">Upper Cap</Label>
            <Input id="upper-cap" className="h-14 border-[#E2E8F0] bg-white rounded-xl" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="floor-cap" className="font-normal text-gray-700">Floor Cap</Label>
            <Input id="floor-cap" className="h-14 border-[#E2E8F0] bg-white rounded-xl" />
          </div>

          <div className="text-sm text-gray-900 font-medium tracking-tight">
            Where markup is more than &ldquo;Upper cap&rdquo;, Upper cap fee will be charged as flat rate
          </div>

          <div className="space-y-2">
            <Label htmlFor="spring-fee" className="font-normal text-gray-700">SpringTD Fee</Label>
            <Input id="spring-fee" className="h-14 border-[#E2E8F0] bg-white rounded-xl" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="markup-fee" className="font-normal text-gray-700">Your Mark-up Fee</Label>
            <Input id="markup-fee" className="h-14 border-[#E2E8F0] bg-white rounded-xl" />
          </div>

          <div className="space-y-2 pt-2">
            <div className="text-sm font-medium text-gray-900">What you will be charged by Spring</div>
            <Label htmlFor="service-fee" className="font-normal text-gray-700">Service Fee</Label>
            <Input id="service-fee" className="h-14 border-[#E2E8F0] bg-white rounded-xl" />
          </div>

          <div className="text-xs text-gray-600">
            This will be charged additional to &ldquo;Mark-up Fee&rdquo;
          </div>

          <Button className="w-full h-14 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium text-lg rounded-xl mt-4">
            Submit
          </Button>
        </div>
    </Drawer>
  )
}
