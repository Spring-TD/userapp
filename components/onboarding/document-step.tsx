"use client"

import { Button } from "@/components/ui/button"
import { CloudUpload } from "lucide-react"

interface OnboardingDocumentsProps {
    onNext: () => void
    onBack: () => void
}

const DocumentRow = ({ title }: { title: string }) => (
    <div className="flex items-center gap-6 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <CloudUpload className="w-5 h-5 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">{title}</h3>
            <p className="text-[10px] text-gray-400">PDF format • Max. 5MB</p>
        </div>
        <Button size="sm" className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-sm h-9 px-6 font-medium">
            Upload
        </Button>
    </div>
)

export function OnboardingDocuments({ onNext, onBack }: OnboardingDocumentsProps) {
    const documents = [
        "COI (certificate of Inc)",
        "Article of formation/Association",
        "Shareholder's list",
        "Proof of Address",
        "Bank Statement",
        "AML Policy",
        "Data & Privacy Policy"
    ]

    return (
        <div className="w-full max-w-[1000px] bg-gray-100/50 p-10 rounded-xl border border-gray-100">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Business Document Upload</h1>
                <p className="text-xs text-gray-500">Upload company documents</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {documents.map((doc, idx) => (
                    <DocumentRow key={idx} title={doc} />
                ))}
            </div>

            <div className="flex gap-4">
                <Button
                    onClick={onBack}
                    className="flex-1 h-[60px] bg-[#444444] text-white hover:bg-gray-800 rounded-lg hover:text-white"
                >
                    Back
                </Button>
                <Button
                    onClick={onNext}
                    className="flex-1 h-[60px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-md hover:shadow-lg transition-all rounded-lg"
                >
                    Next
                </Button>
            </div>
        </div>
    )
}
