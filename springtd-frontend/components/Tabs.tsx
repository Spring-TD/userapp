"use client"

import { Lock, Check } from "lucide-react"

interface Tab {
  id: string
  label: string
  locked?: boolean
  completed?: boolean
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
  containerClassName?: string
  activeTabClassName?: string
  inactiveTabClassName?: string
}

export default function Tabs({
  tabs,
  activeTab,
  onTabChange,
  className = "",
  containerClassName = "",
  activeTabClassName = "border-[#9A813F] text-[#9A813F]",
  inactiveTabClassName = "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
}: TabsProps) {
  return (
    <div className={`border-b border-gray-200 ${containerClassName}`}>
      <nav className={`-mb-px flex space-x-8 ${className}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const isLocked = tab.locked
          const isCompleted = tab.completed

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (!isLocked) {
                  onTabChange(tab.id)
                }
              }}
              disabled={isLocked}
              title={isLocked ? "Complete the previous step first" : undefined}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 transition-all ${isLocked
                ? "border-transparent text-gray-300 cursor-not-allowed"
                : isActive
                  ? activeTabClassName
                  : inactiveTabClassName
                }`}
            >
              {isCompleted && !isActive && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                  <Check className="w-3 h-3 text-green-600" />
                </span>
              )}
              {isLocked && (
                <Lock className="w-4 h-4 text-gray-300" />
              )}
              {tab.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
