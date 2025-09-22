'use client';

import React, { useState } from 'react';
import { Trash2, MoreVertical, Send } from 'lucide-react';

const ComplianceChat: React.FC = () => {
  const [messages] = useState([
    "How to use SpringTD Product",
    "Having issues with the new product",
    "How to use SpringTD Product",
    "Having issues with the new product",
  ]);

  return (
    <div className="px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Messages Panel */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-base font-medium text-gray-800 mb-4">Messages</h2>
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className="px-4 py-3 bg-gray-100 rounded-lg text-sm text-gray-700 cursor-pointer hover:bg-gray-200 transition"
              >
                {msg}
              </div>
            ))}
          </div>
        </div>

        {/* Right Chat Box */}
        <div className="lg:col-span-3 bg-gray-50 border border-gray-200 rounded-xl p-12 flex flex-col justify-between min-h-[686px]">
          <div className="flex-1 flex flex-col">
            <label className="text-sm text-gray-600 block">Compose message</label>
            <hr className="border-gray-300 my-4" />

            <textarea
              placeholder=""
              className="flex-1 resize-none bg-gray-100 border-none rounded-lg p-4 focus:outline-none text-gray-900"
            />
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between mt-4">
            <button
              className="flex items-center gap-2 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: "#9A813F" }}
            >
              Send <Send size={16} />
            </button>

            <div className="flex items-center gap-3 text-gray-400">
              <MoreVertical size={20} className="cursor-pointer hover:text-gray-600" />
              <Trash2 size={20} className="cursor-pointer hover:text-red-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceChat;
