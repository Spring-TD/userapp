"use client"

import Tabs from "@/components/Tabs"
import { useState, useEffect } from "react"
import { ComplianceFormProvider } from "@/providers/ComplianceFormProvider"

import BusinessInfoTab from "@/components/forms/BusinessInfoTab"
import BusinessDocumentWrapper from "@/components/forms/BusinessDocumentWrapper"
import ShareholderInfo from "@/components/forms/ShareholderInfo"

const COMPLETION_KEY = "kyc.tabCompletion"

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

  // Hydrate completion state from localStorage
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(COMPLETION_KEY)
        if (saved) {
          setCompletion(JSON.parse(saved))
        }
        // Also check if business info exists (for users who already filled it)
        const businessInfo = localStorage.getItem("kyc.businessInfo")
        if (businessInfo) {
          const info = JSON.parse(businessInfo)
          // Check if essential fields are filled
          if (info.businessName && info.country && info.industry) {
            setCompletion((prev) => {
              const next = { ...prev, "business-info": true }
              localStorage.setItem(COMPLETION_KEY, JSON.stringify(next))
              return next
            })
          }
        }
      }
    } catch (_) {
      // ignore
    }
  }, [])

  const markComplete = (tabId: keyof TabCompletion) => {
    setCompletion((prev) => {
      const next = { ...prev, [tabId]: true }
      try {
        localStorage.setItem(COMPLETION_KEY, JSON.stringify(next))
      } catch (_) {}
      return next
    })
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
      completed: completion["business-info"]
    },
    { 
      id: "business-document", 
      label: "Business Document",
      locked: !completion["business-info"],
      completed: completion["business-document"]
    },
    { 
      id: "shareholder-info", 
      label: "Shareholder Info",
      locked: !completion["business-document"],
      completed: completion["shareholder-info"]
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
        <div className="px-8 py-4">
          <Tabs 
            tabs={tabs} 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            activeTabClassName="border-[#7C3AED] text-[#7C3AED]"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">{renderTabContent()}</div>
      </div>
    </ComplianceFormProvider>
  )
}
