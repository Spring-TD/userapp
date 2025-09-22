'use client';

import React from 'react';
import { BsGridFill } from 'react-icons/bs';
import { MdAddBox } from 'react-icons/md';
import { FaMoneyBill, FaUsers } from 'react-icons/fa';
import { IoMdCube } from "react-icons/io";
import { TbCodeCircle2Filled } from "react-icons/tb";
import { RiSettings3Fill } from "react-icons/ri";
import { FiLogOut } from "react-icons/fi";
import { SearchIcon } from 'lucide-react';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
}

interface SidebarProps {
  className?: string; // ✅ external class support
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const navItems: NavItem[] = [
    { icon: <BsGridFill size={20} />, label: 'Overview' },
    { icon: <MdAddBox size={20} />, label: 'Create App' },
    { icon: <FaUsers size={20} />, label: 'Admin' },
    { icon: <FaMoneyBill size={20} />, label: 'Billing' },
    { icon: <IoMdCube size={20} />, label: 'Compliance', isActive: true },
    { icon: <TbCodeCircle2Filled size={20} />, label: 'Developer' },
  ];

  return (
    <div className={`w-64 bg-white border-r border-[#E0D8C3] h-screen flex flex-col ${className}`}>
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold" style={{ color: '#9A813F' }}>
          Spring TD
        </h1>
      </div>

      {/* Search */}
      <div className="px-6 mb-6">
        <div className="relative">
          <SearchIcon
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#9A813F] focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">
        <ul className="space-y-4">
          {navItems.map((item, index) => (
            <li key={index}>
              <a
                href="#"
                className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                  item.isActive
                    ? 'bg-[#FDF8EB] text-[#9A813F] font-medium'
                    : 'text-gray-700 hover:bg-[#FFF3D380]'
                }`}
              >
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>

        {/* Section Title */}
        <div className="mt-8 mb-2">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Section Title
          </h3>
        </div>

        {/* Settings */}
        <ul>
          <li>
            <a
              href="#"
              className="flex items-center space-x-3 px-3 py-2 rounded-md text-gray-700 hover:bg-[#FFF3D380] transition-colors text-sm"
            >
              <RiSettings3Fill size={20} />
              <span>Settings</span>
            </a>
          </li>
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src="https://www.shutterstock.com/image-photo/portrait-black-woman-smile-arms-600nw-2329488115.jpg"
              alt="Grace Ayo"
              className="w-9 h-9 rounded-full object-cover justify-center items-center"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Grace Ayo</p>
              <p className="text-xs text-gray-500">grace.yo@spring.td</p>
            </div>
          </div>
          <FiLogOut size={20} className="text-gray-500 cursor-pointer" />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
