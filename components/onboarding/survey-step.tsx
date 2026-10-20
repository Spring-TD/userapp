"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CountrySelect } from "@/components/ui/country-select"
import { Upload } from "lucide-react"
import { WEBSITE_URL_PREFIX } from "@/lib/websiteUrl"

interface OnboardingSurveyProps {
    onNext: () => void
    onBack: () => void
}

export function OnboardingSurvey({ onNext, onBack }: OnboardingSurveyProps) {
    const [userBase, setUserBase] = useState("")
    const [countryOfIncorporation, setCountryOfIncorporation] = useState("")
    const [website, setWebsite] = useState(WEBSITE_URL_PREFIX)

    return (
        <div className="w-full max-w-[1240px] flex gap-12">
            {/* Left Card: Business Survey */}
            <div className="flex-1 bg-gray-100/50 p-8 rounded-xl border border-gray-100 h-fit">
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Business Survey</h2>
                    <p className="text-[10px] text-gray-500">Fill in the required information below to create your business account.</p>
                </div>

                <div className="space-y-4 bg-white p-8 rounded-lg shadow-sm border border-gray-100">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-gray-500">What do you want to create?</label>
                        <Select>
                            <SelectTrigger className="w-full !h-[60px] flex items-center bg-white border-none shadow-sm text-base">
                                <SelectValue placeholder="Select a Business Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="llc">LLC</SelectItem>
                                <SelectItem value="corp">Corporation</SelectItem>
                                <SelectItem value="sole">Sole Proprietorship</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-gray-500">Where is your user base?</label>
                        <CountrySelect
                            value={userBase}
                            onValueChange={setUserBase}
                            placeholder="Select country"
                            triggerClassName="w-full !h-[60px] flex items-center bg-white border-none shadow-sm text-base"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-gray-500">What is your business model?</label>
                        <Select>
                            <SelectTrigger className="w-full !h-[60px] flex items-center bg-white border-none shadow-sm text-base">
                                <SelectValue placeholder="Select Business Model" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="b2b">B2B</SelectItem>
                                <SelectItem value="b2c">B2C</SelectItem>
                                <SelectItem value="saas">SaaS</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-gray-500">Monthly processed volume</label>
                        <Select>
                            <SelectTrigger className="w-full !h-[60px] flex items-center bg-white border-none shadow-sm text-base">
                                <SelectValue placeholder="Select volume range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0-10k">$0 - $10k</SelectItem>
                                <SelectItem value="10k-50k">$10k - $50k</SelectItem>
                                <SelectItem value="50k+">$50k+</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Right Card: About the Business */}
            <div className="flex-1 bg-gray-100/50 p-8 rounded-xl border border-gray-100 h-fit flex flex-col">
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">About the Business</h2>
                    <p className="text-[10px] text-gray-500">Fill in the required information below to create your business account.</p>
                </div>

                <div className="space-y-4 bg-white p-8 rounded-lg shadow-sm border border-gray-100 mb-8">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-gray-500">Industry</label>
                        <Select>
                            <SelectTrigger className="w-full !h-[60px] flex items-center bg-white border-none ring-1 ring-gray-100 shadow-sm text-base">
                                <SelectValue placeholder="Select Industry Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="tech">Technology</SelectItem>
                                <SelectItem value="retail">Retail</SelectItem>
                                <SelectItem value="finance">Finance</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-gray-500">Country of incorporation</label>
                        <CountrySelect
                            value={countryOfIncorporation}
                            onValueChange={setCountryOfIncorporation}
                            placeholder="Select country"
                            triggerClassName="w-full !h-[60px] flex items-center bg-white border-none ring-1 ring-gray-100 shadow-sm text-base"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-gray-500">Business Name</label>
                        <Input
                            className="h-[60px] border-none ring-1 ring-gray-100 shadow-sm text-base focus:ring-[#7C3AED]/20"
                            placeholder="Business Name"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-gray-500">Website</label>
                        <Input
                            type="url"
                            value={website}
                            onChange={(e) => {
                                const v = e.target.value
                                const next = (v.startsWith("https://") || v.startsWith("http://") || v === "") ? v : WEBSITE_URL_PREFIX + v
                                setWebsite(next)
                            }}
                            className="h-[60px] border-none ring-1 ring-gray-100 shadow-sm text-base focus:ring-[#7C3AED]/20"
                            placeholder="example.com"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-gray-500">Company Reg. ID Number</label>
                        <Input
                            className="h-[60px] border-none ring-1 ring-gray-100 shadow-sm text-base focus:ring-[#7C3AED]/20"
                            placeholder="Company Reg. ID Number"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3 p-3 bg-white border border-dashed border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200">
                                <Upload className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-700">Upload Company Logo</p>
                                <p className="text-[10px] text-gray-400">PDF format • Max. 5MB</p>
                            </div>
                            <Button size="sm" className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-8 text-xs px-4">
                                Upload
                            </Button>
                        </div>
                    </div>
                </div>

                <Button
                    onClick={onNext}
                    className="w-full h-[60px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-md hover:shadow-lg transition-all rounded-lg mt-auto"
                >
                    Next
                </Button>
            </div>
        </div>
    )
}
