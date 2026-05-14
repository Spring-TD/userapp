"use client"

import Tabs from "@/components/Tabs"
import { useState } from "react"

import { AddStaffTab } from "@/components/forms/AddStaffTab"
import { ManageRoleTab } from "@/components/forms/ManageRoleTab"
import { CreateRoleTab } from "@/components/forms/CreateRoleTab"

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("add-staff")

  const tabs = [
    { id: "add-staff", label: "Add staff" },
    { id: "manage-role", label: "Manage role" },
    { id: "create-role", label: "Create Role" },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case "add-staff":
        return <AddStaffTab />
      case "manage-role":
        return <ManageRoleTab />
      case "create-role":
        return <CreateRoleTab />
      default:
        return <AddStaffTab />
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
