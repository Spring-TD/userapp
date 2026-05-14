"use client"

import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-16 tracking-tight">
          Choose Your Platform
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-8">
          {/* Product Builder Card */}
          <Link
            href="/signin"
            className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 flex flex-col items-center justify-center gap-8 hover:-translate-y-1 block h-80"
          >
            <div className="flex items-center justify-center h-20 transition-transform duration-300 group-hover:scale-110">
              <span className="text-2xl font-bold text-[#9A813F] text-center">Product Builder</span>
            </div>
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center justify-center px-6 py-3 bg-[#9A813F]/10 text-[#9A813F] rounded-full font-semibold group-hover:bg-[#9A813F] group-hover:text-white transition-colors duration-300 text-sm">
                Go to Builder
                <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Merchant Dashboard Card */}
          <Link
            href="/dashboard/merchant"
            className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 flex flex-col items-center justify-center gap-8 hover:-translate-y-1 block h-80"
          >
            <div className="flex items-center justify-center h-20 transition-transform duration-300 group-hover:scale-110">
              <span className="text-2xl font-bold text-[#7C3AED] text-center">Spring App</span>
            </div>
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center justify-center px-6 py-3 bg-[#7C3AED]/10 text-[#7C3AED] rounded-full font-semibold group-hover:bg-[#7C3AED] group-hover:text-white transition-colors duration-300 text-sm">
                Go to Dashboard
                <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>

          {/* User App Card */}
          <Link
            href="/mobile"
            className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 flex flex-col items-center justify-center gap-8 hover:-translate-y-1 block h-80"
          >
            <div className="flex items-center justify-center h-20 transition-transform duration-300 group-hover:scale-110">
              <span className="text-2xl font-bold text-[#9A813F] text-center">User App</span>
            </div>
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center justify-center px-6 py-3 bg-[#9A813F]/10 text-[#9A813F] rounded-full font-semibold group-hover:bg-[#9A813F] group-hover:text-white transition-colors duration-300 text-sm">
                Go to App
                <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>

          {/* User App 2 Card */}
          <Link
            href="/mobile-v2"
            className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 flex flex-col items-center justify-center gap-8 hover:-translate-y-1 block h-80"
          >
            <div className="flex items-center justify-center h-20 transition-transform duration-300 group-hover:scale-110">
              <span className="text-2xl font-bold text-[#2563EB] text-center">User App 2</span>
            </div>
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center justify-center px-6 py-3 bg-[#2563EB]/10 text-[#2563EB] rounded-full font-semibold group-hover:bg-[#2563EB] group-hover:text-white transition-colors duration-300 text-sm">
                Go to App 2
                <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
