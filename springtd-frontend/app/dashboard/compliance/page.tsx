'use client';

import { DashboardHeader } from '@/components/DashboardHeader';
import BusinessDocument from '@/components/forms/BusinessDocument';
import BusinessDocumentWrapper from '@/components/forms/BusinessDocumentWrapper';
import BusinessInfoTab from '@/components/forms/BusinessInfoTab';
import ComplianceChat from '@/components/forms/ComplianceChat';
import ShareholderInfo from '@/components/forms/ShareholderInfo';
import Sidebar from '@/components/Sidebar';
import Tabs from '@/components/Tabs';
import React, { useState } from 'react';

export default function ComplianceDashboard() {
  const [activeTab, setActiveTab] = useState('business-info');

  const tabs = [
    { id: 'business-info', label: 'Business Info' },
    { id: 'business-document', label: 'Business Document' },
    { id: 'shareholder-info', label: "Shareholder's Info" },
    { id: 'compliance-chat', label: 'Compliance Chat' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'business-info':
        return <BusinessInfoTab />;
      case 'business-document':
        return <BusinessDocumentWrapper />;
      case 'shareholder-info':
        return <ShareholderInfo />;
      case 'compliance-chat':
        return <ComplianceChat />;
      default:
        return <BusinessInfoTab />;
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar on the left */}
      <Sidebar className="w-64 shrink-0 border-r" />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <DashboardHeader />

        {/* Tabs */}
        <div className="px-8 py-4">
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
