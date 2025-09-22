"use client";

import React from "react";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex space-x-8">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`pb-4 text-sm font-medium transition-colors ${
                isActive
                  ? "border-b-2"
                  : "border-b-2 border-transparent hover:border-gray-300"
              }`}
              style={{
                borderColor: isActive ? "#9A813F" : "transparent",
                color: isActive ? "#9A813F" : "#6B7280",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Tabs;
