"use client"

import Tabs from "@/components/Tabs"
import { useState } from "react"
import { ComplianceFormProvider } from "@/providers/ComplianceFormProvider"

import BusinessInfoTab from "@/components/forms/BusinessInfoTab"
import BusinessDocumentWrapper from "@/components/forms/BusinessDocumentWrapper"
import ShareholderInfo from "@/components/forms/ShareholderInfo"

interface TabCompletion {
  "business-info": boolean
  "business-document": boolean
  "shareholder-info": boolean
}

export default function ComplianceDashboard() {
  const [activeTab, setActiveTab] = useState("business-info")
  const [completion, setCompletion] = useState<TabCompletion>({
    "business-info": false,
    "business-document": false,
    "shareholder-info": false,
  })

  const markComplete = (tabId: keyof TabCompletion) => {
    setCompletion((prev) => ({ ...prev, [tabId]: true }))
  }

  const handleBusinessInfoContinue = () => {
    markComplete("business-info")
    setActiveTab("business-document")
  }

  const handleBusinessDocumentContinue = () => {
    markComplete("business-document")
    setActiveTab("shareholder-info")
  }

  const tabs = [
    {
      id: "business-info",
      label: "Business Info",
      locked: false,
      completed: completion["business-info"],
    },
    {
      id: "business-document",
      label: "Business Document",
      locked: !completion["business-info"],
      completed: completion["business-document"],
    },
    {
      id: "shareholder-info",
      label: "Shareholder Info",
      locked: !completion["business-document"],
      completed: completion["shareholder-info"],
    },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case "business-info":
        return <BusinessInfoTab onContinue={handleBusinessInfoContinue} />
      case "business-document":
        return <BusinessDocumentWrapper onContinue={handleBusinessDocumentContinue} />
      case "shareholder-info":
        return <ShareholderInfo />
      default:
        return <BusinessInfoTab onContinue={handleBusinessInfoContinue} />
    }
  }

  return (
    <ComplianceFormProvider>
      <div className="flex flex-col h-full">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            activeTabClassName="border-[#2563EB] text-[#2563EB]"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">{renderTabContent()}</div>
      </div>
    </ComplianceFormProvider>
  )
}
