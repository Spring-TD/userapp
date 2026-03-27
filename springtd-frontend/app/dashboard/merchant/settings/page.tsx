"use client"

import { useState } from "react"
import { Copy, Trash2, ChevronRight, CircleHelp, Flag, Search, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Tabs from "@/components/Tabs"

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("account-settings")
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

    const tabs = [
        { id: "account-settings", label: "Account Settings" },
        { id: "login-security", label: "Login & Security" },
        { id: "faq", label: "FAQ" },
        { id: "contact-support", label: "Contact Support" },
        { id: "tc-policy", label: "T&C / Policy" },
        { id: "account-control", label: "Account Control" },
    ]

    const faqs = [
        {
            question: "Why is SpringTD",
            answer: "Lorem ipsum dolor sit amet consectetur. Rhoncus purus sed vestibulum dignissim libero tellus. Et vitae in eget dui id lectus parturient magna. Et vitae in eget dui id lectus parturient magna. Et vitae in eget dui id lectus parturient magna."
        },
        {
            question: "How does Mortgage Work?",
            answer: "Mortgage works by providing financial assistance for property purchases..."
        },
        {
            question: "Who can use Mortgage?",
            answer: "Anyone who meets the eligibility criteria..."
        },
        {
            question: "What is Product Builder?",
            answer: "Product Builder is a tool that allows you to create custom financial products..."
        },
        {
            question: "Who can use Mortgage?",
            answer: "Anyone who meets the eligibility criteria..."
        },
        {
            question: "How does Mortgage Work?",
            answer: "Mortgage works by providing financial assistance for property purchases..."
        }
    ]

    const toggleFaq = (index: number) => {
        setOpenFaqIndex(openFaqIndex === index ? null : index)
    }

    return (
        <div className="p-8 bg-white min-h-full">
            <div className="flex flex-col space-y-8">
                {/* Header with Tabs and Button */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-0">
                    <div className="flex-1 overflow-x-auto">
                        <Tabs
                            tabs={tabs}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            containerClassName="border-b-0"
                            activeTabClassName="border-[#7F56D9] text-[#7F56D9]"
                        />
                    </div>
                    <div className="mt-4 sm:mt-0 sm:ml-4 pb-2">
                        {(activeTab === "account-settings" || activeTab === "login-security") && (
                            <Button className="bg-[#7F56D9] text-white hover:bg-[#6941C6] rounded-md px-6">
                                Update Profile
                            </Button>
                        )}
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === "account-settings" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-w-5xl">
                        <div className="space-y-2">
                            <Label htmlFor="fullName" className="text-gray-600 font-normal">
                                Full name
                            </Label>
                            <Input
                                id="fullName"
                                placeholder="Please enter your full name"
                                className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-600 font-normal">
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Please enter your email"
                                className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-gray-600 font-normal">
                                Username
                            </Label>
                            <Input
                                id="username"
                                placeholder="Please enter your username"
                                className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-gray-600 font-normal">
                                Phone number
                            </Label>
                            <div className="flex">
                                <div className="flex items-center justify-center bg-[#F0F2F5] px-3 rounded-l-md border-r border-gray-300 text-gray-500 h-12">
                                    +234
                                </div>
                                <Input
                                    id="phone"
                                    placeholder="Please enter your phone number"
                                    className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12 rounded-l-none"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "login-security" && (
                    <div className="space-y-10 max-w-5xl">
                        {/* Change Password Section */}
                        <section>
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
                                <p className="text-sm text-gray-500">Update your password to keep your account secure</p>
                            </div>
                            <div className="space-y-6">
                                <Input
                                    placeholder="Enter Current Password"
                                    className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12"
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input
                                        placeholder="Enter New Password"
                                        className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12"
                                    />
                                    <Input
                                        placeholder="Confirm New Password"
                                        className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Active Sessions Section */}
                        <section>
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-gray-900">Active Sessions</h2>
                                <p className="text-sm text-gray-500">Manage your active login sessions across devices</p>
                            </div>
                            <div className="bg-[#F0F2F5] rounded-lg p-6 space-y-4">
                                <div className="flex justify-between items-center bg-white p-4 rounded-md shadow-sm">
                                    <div>
                                        <p className="font-medium text-gray-900">Chrome on MacBook Pro</p>
                                        <p className="text-sm text-gray-500">Lagos, Nigeria • Active now</p>
                                    </div>
                                    <span className="text-green-600 text-sm font-medium">Current</span>
                                </div>
                                <div className="flex justify-between items-center bg-white p-4 rounded-md shadow-sm">
                                    <div>
                                        <p className="font-medium text-gray-900">Safari on iPhone 14</p>
                                        <p className="text-sm text-gray-500">Lagos, Nigeria • 2 hours ago</p>
                                    </div>
                                    <button className="text-red-500 text-sm font-medium hover:text-red-600">Revoke</button>
                                </div>
                                <div className="flex justify-between items-center bg-white p-4 rounded-md shadow-sm">
                                    <div>
                                        <p className="font-medium text-gray-900">Chrome on Windows</p>
                                        <p className="text-sm text-gray-500">Abuja, Nigeria • Yesterday</p>
                                    </div>
                                    <button className="text-red-500 text-sm font-medium hover:text-red-600">Revoke</button>
                                </div>
                            </div>
                        </section>

                        {/* API Keys Section */}
                        <section>
                            <div className="flex justify-between items-center mb-6">
                                <div className="space-y-1">
                                    <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
                                    <p className="text-sm text-gray-500">Manage your API keys for integration</p>
                                </div>
                                <Button className="bg-[#7F56D9] text-white hover:bg-[#6941C6] rounded-md px-6">
                                    Generate New Key
                                </Button>
                            </div>
                            <div className="bg-[#F0F2F5] rounded-lg p-6 space-y-4">
                                <div className="flex justify-between items-center bg-white p-4 rounded-md shadow-sm">
                                    <div>
                                        <p className="font-medium text-gray-900">Production Key</p>
                                        <p className="text-sm text-gray-500">Created Dec 1, 2025</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <Copy className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700" />
                                        <Trash2 className="w-4 h-4 text-red-500 cursor-pointer hover:text-red-600" />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center bg-white p-4 rounded-md shadow-sm">
                                    <div>
                                        <p className="font-medium text-gray-900">Development Key</p>
                                        <p className="text-sm text-gray-500">Created Dec 5, 2025</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <Copy className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700" />
                                        <Trash2 className="w-4 h-4 text-red-500 cursor-pointer hover:text-red-600" />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center bg-white p-4 rounded-md shadow-sm">
                                    <div>
                                        <p className="font-medium text-gray-900">Production Key</p>
                                        <p className="text-sm text-gray-500">Created Dec 8, 2025</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <Copy className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700" />
                                        <Trash2 className="w-4 h-4 text-red-500 cursor-pointer hover:text-red-600" />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === "faq" && (
                    <div className="max-w-5xl">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">Frequently Asked Questions</h2>
                            <p className="text-sm text-gray-500">Find answers to common questions about Spring TD</p>
                        </div>

                        {/* Search Section */}
                        <div className="bg-[#F0F2F5] rounded-lg p-6 mb-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <Input
                                    placeholder="Search"
                                    className="pl-10 bg-white border-none h-12 text-gray-900 placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                        {/* FAQ List Section */}
                        <div className="bg-[#F0F2F5] rounded-lg p-6 space-y-4">
                            {faqs.map((faq, index) => (
                                <div key={index} className="bg-white rounded-lg p-6">
                                    <button
                                        onClick={() => toggleFaq(index)}
                                        className="w-full flex justify-between items-center text-left"
                                    >
                                        <span className="font-medium text-gray-900 text-sm">{faq.question}</span>
                                        {openFaqIndex === index ? (
                                            <ChevronUp className="w-5 h-5 text-gray-500" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-500" />
                                        )}
                                    </button>
                                    {openFaqIndex === index && (
                                        <div className="mt-4 pt-4 border-t border-gray-100 text-gray-600 text-sm leading-relaxed">
                                            {faq.answer}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "contact-support" && (
                    <div className="max-w-5xl">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">Contact Support</h2>
                            <p className="text-sm text-gray-500">Get in touch with our support team</p>
                        </div>
                        <div className="bg-[#F0F2F5] rounded-lg p-6 space-y-4">
                            <button className="w-full flex items-center justify-between bg-white p-4 rounded-md shadow-sm hover:bg-gray-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                                        <CircleHelp className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="font-medium text-gray-900">Customer Support</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                            </button>

                            <button className="w-full flex items-center justify-between bg-white p-4 rounded-md shadow-sm hover:bg-gray-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center">
                                        <CircleHelp className="w-5 h-5 text-gray-900" />
                                    </div>
                                    <span className="font-medium text-gray-900">Website</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                            </button>

                            <button className="w-full flex items-center justify-between bg-white p-4 rounded-md shadow-sm hover:bg-gray-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center">
                                        <Flag className="w-5 h-5 text-gray-900" />
                                    </div>
                                    <span className="font-medium text-gray-900">WhatsApp</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === "tc-policy" && (
                    <div className="max-w-5xl space-y-10">
                        {/* Terms of Service Summary */}
                        <section>
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-gray-900">Terms of Service Summary</h2>
                            </div>
                            <div className="bg-[#F0F2F5] rounded-lg p-8 text-sm text-gray-600 space-y-6 leading-relaxed">
                                <div>
                                    <p className="font-bold text-gray-900 mb-1">Effective Date: January 1, 2025</p>
                                    <p>This document governs your rights and obligations when using our services, effective from the date above.</p>
                                </div>

                                <div className="space-y-1">
                                    <p className="font-bold text-gray-900">1. Introduction</p>
                                    <p>Welcome to SpringTD. By using our mobile application or website, you agree to these Terms and Conditions. Please read them carefully.</p>
                                </div>

                                <div className="space-y-1">
                                    <p className="font-bold text-gray-900">2. Eligibility</p>
                                    <p>You must be at least 18 years old to use our services. By registering, you confirm that the information you provide is accurate and complete.</p>
                                </div>

                                <div className="space-y-1">
                                    <p className="font-bold text-gray-900">3. Services</p>
                                    <p>Our platform offers digital wallet services, peer-to-peer transfers, card management, and international transactions. We reserve the right to modify or terminate any part of the service at any time.</p>
                                </div>

                                <div className="space-y-1">
                                    <p className="font-bold text-gray-900">4. Fees and Charges</p>
                                    <p>We aim to keep fees transparent. You will be notified of any charges before confirming a transaction. Please refer to our Pricing Page for up-to-date details.</p>
                                </div>

                                <div className="space-y-1">
                                    <p className="font-bold text-gray-900">5. User Responsibilities</p>
                                    <p>You are responsible for maintaining the confidentiality of your account and password. Unauthorized use must be reported immediately to our support team.</p>
                                </div>
                            </div>
                        </section>

                        {/* Privacy Policy Summary */}
                        <section>
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-gray-900">Privacy Policy Summary</h2>
                            </div>
                            <div className="bg-[#F0F2F5] rounded-lg p-8 text-sm text-gray-600 space-y-6 leading-relaxed">
                                <div>
                                    <p className="font-bold text-gray-900 mb-1">Effective Date: January 1, 2025</p>
                                    <p>This policy outlines how we handle your personal data starting from the date shown above.</p>
                                </div>

                                <div className="space-y-1">
                                    <p className="font-bold text-gray-900">1. Overview</p>
                                    <p>Your privacy is important to us. This Privacy Policy explains how [YourApp Name] collects, uses, and protects your personal information.</p>
                                </div>

                                <div className="space-y-1">
                                    <p className="font-bold text-gray-900">2. Information We Collect</p>
                                    <p>We may collect the following data:</p>
                                    <ul className="list-disc pl-5 mt-1 space-y-1">
                                        <li>Full name, email address, and phone number</li>
                                        <li>Payment card information</li>
                                        <li>Transaction history</li>
                                        <li>Location data (with permission)</li>
                                        <li>Device information</li>
                                    </ul>
                                </div>

                                <div className="space-y-1">
                                    <p className="font-bold text-gray-900">3. How We Use Your Data</p>
                                    <p>We use your data to:</p>
                                    <ul className="list-disc pl-5 mt-1 space-y-1">
                                        <li>Provide and improve our services</li>
                                        <li>Process transactions</li>
                                        <li>Prevent fraud and ensure security</li>
                                        <li>Send account-related notifications</li>
                                    </ul>
                                </div>

                                <div className="space-y-1">
                                    <p className="font-bold text-gray-900">4. Data Sharing</p>
                                    <p>We do not sell your data. We only share it with:</p>
                                    <ul className="list-disc pl-5 mt-1 space-y-1">
                                        <li>Regulatory authorities (when required by law)</li>
                                        <li>Payment partners and financial institutions</li>
                                        <li>Service providers under confidentiality agreements</li>
                                    </ul>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === "account-control" && (
                    <div className="max-w-5xl">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">Deactivate Account</h2>
                        </div>
                        <div className="bg-[#F0F2F5] rounded-lg p-8">
                            <p className="text-gray-600 mb-6">
                                Temporarily deactivate your account. Your data will be preserved and you can reactivate anytime by logging back in. Your subscription will be paused during deactivation.
                            </p>
                            <ul className="list-disc pl-5 space-y-2 text-gray-600 mb-8">
                                <li>Your profile will not be visible to others</li>
                                <li>Active subscriptions will be paused</li>
                                <li>You can reactivate within 90 days</li>
                                <li>After 90 days, your account may be permanently deleted</li>
                            </ul>
                            <Button className="bg-[#FF4D4F] hover:bg-[#FF7875] text-white border-none px-6">
                                Deactivate Account
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
