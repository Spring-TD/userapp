"use client"

import Tabs from "@/components/Tabs"
import { useState } from "react"

import { CredentialsTab } from "@/components/merchant-forms/CredentialsTab"
import { ProductTab } from "@/components/merchant-forms/ProductTab"
import { CallbacksTab } from "@/components/merchant-forms/CallbacksTab"
import { SecurityTab } from "@/components/merchant-forms/SecurityTab"

export default function MerchantDeveloperDashboard() {
    const [activeTab, setActiveTab] = useState("credentials")

    const tabs = [
        { id: "credentials", label: "Credentials" },
        { id: "product", label: "Product" },
        { id: "callbacks", label: "Call backs" },
        { id: "security", label: "Security" },
    ]

    const renderTabContent = () => {
        switch (activeTab) {
            case "credentials":
                return <CredentialsTab />
            case "product":
                return <ProductTab />
            case "callbacks":
                return <CallbacksTab />
            case "security":
                return <SecurityTab />
            default:
                return <CredentialsTab />
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="px-8 py-4">
                <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} activeTabClassName="border-[#7C3AED] text-[#7C3AED]" />
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6">{renderTabContent()}</div>
        </div>
    )
}
