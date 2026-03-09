"use client"

import Tabs from "@/components/Tabs"
import { useState } from "react"

import { BillingHistoryTab } from "@/components/forms/BillingHistoryTab"
import { PaymentMethodTab } from "@/components/forms/PaymentMethodTab"

export default function BillingDashboard() {
  const [activeTab, setActiveTab] = useState("billing-history")

  const tabs = [
    { id: "billing-history", label: "Billing History" },
    { id: "payment-method", label: "Payment Method" },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case "billing-history":
        return <BillingHistoryTab />
      case "payment-method":
        return <PaymentMethodTab />
      default:
        return <BillingHistoryTab />
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-4">
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">{renderTabContent()}</div>
    </div>
  )
}
