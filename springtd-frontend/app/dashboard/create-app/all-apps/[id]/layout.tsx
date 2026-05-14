"use client"

import type React from "react"
import { use } from "react"
import AppSidebar from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"

export default function AppDetailsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <div className="flex h-screen bg-gray-50">
      <AppSidebar appId={id} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
