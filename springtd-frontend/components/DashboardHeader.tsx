'use client';

import React from 'react';
import { HiMiniUser } from 'react-icons/hi2';
import { FaBell } from 'react-icons/fa';

export const DashboardHeader: React.FC = () => {
  return (
    <header className="bg-white">
      {/* Top mini-bar (icons aligned to the top-right, separated by a tiny divider) */}
      <div className="px-6 pt-3 flex items-center justify-end">
        {/* vertical thin divider left of icons (matches screenshot spacing) */}
        <div className="h-6 w-px bg-gray-200 mr-6" />

        <div className="flex items-center gap-6">
          {/* Notification (top-right small area with badge) */}
          <div className="relative">
            <FaBell className="h-6 w-6 text-gray-600" />
            <span className="absolute -top-1 -right-1 bg-[#9A813F] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium">
              4
            </span>
          </div>

          {/* Avatar (small circular avatar in pale/amber background) */}
          <div className="w-9 h-9 rounded-full bg-[#F0ECE2] flex items-center justify-center">
            <HiMiniUser className="h-4 w-4 text-[#9A813F]" />
          </div>
        </div>
      </div>

      {/* thin horizontal rule between top mini-bar and main header content */}
      <div className="border-b border-[#E0D8C3] mt-4" />

      {/* Main header row: title on the left, Submit button aligned to the right */}
      <div className="px-6 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Compliance</h1>
          <p className="text-sm text-gray-500 mt-1">Control your integrations</p>
        </div>

        <div>
          <button className="bg-black text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-gray-800 transition-colors">
            Submit
          </button>
        </div>
      </div>
    </header>
  );
};
