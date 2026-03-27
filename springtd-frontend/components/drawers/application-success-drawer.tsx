"use client"

import { CheckCircle } from "lucide-react"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"

interface ApplicationSuccessDrawerProps {
  isOpen: boolean
  onClose: () => void
  onViewApplications?: () => void
  applicationType: "loan" | "savings" | "mortgage" | "commodity"
  applicationId?: string
  details?: {
    productName?: string
    amount?: string
    reference?: string
  }
}

const SUCCESS_MESSAGES = {
  loan: {
    title: "Loan Application Submitted",
    description: "Your loan application has been submitted successfully and is pending review.",
    buttonText: "View My Applications",
  },
  savings: {
    title: "Savings Account Created",
    description: "Your savings account has been created successfully.",
    buttonText: "View My Accounts",
  },
  mortgage: {
    title: "Mortgage Application Submitted",
    description: "Your mortgage application has been submitted successfully and is pending review.",
    buttonText: "View My Applications",
  },
  commodity: {
    title: "Purchase Successful",
    description: "Your commodity purchase has been processed successfully.",
    buttonText: "View My Portfolio",
  },
}

export default function ApplicationSuccessDrawer({
  isOpen,
  onClose,
  onViewApplications,
  applicationType,
  applicationId,
  details,
}: ApplicationSuccessDrawerProps) {
  const messages = SUCCESS_MESSAGES[applicationType]

  return (
    <Drawer open={isOpen} onOpenChange={onClose} title="" subtitle="">
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="text-green-600" size={32} />
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-2">{messages.title}</h2>
        <p className="text-sm text-gray-600 mb-6">{messages.description}</p>

        {/* Application Details */}
        {(details || applicationId) && (
          <div className="w-full bg-gray-50 rounded-lg p-4 mb-8 space-y-3">
            {applicationId && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Reference ID</span>
                <span className="font-mono font-medium text-gray-900">{applicationId}</span>
              </div>
            )}
            {details?.productName && (
              <>
                <div className="h-px bg-gray-200" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Product</span>
                  <span className="font-medium text-gray-900">{details.productName}</span>
                </div>
              </>
            )}
            {details?.amount && (
              <>
                <div className="h-px bg-gray-200" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-medium text-gray-900">{details.amount}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Status Info */}
        {(applicationType === "loan" || applicationType === "mortgage") && (
          <div className="w-full bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8">
            <p className="text-sm text-blue-800">
              <strong>What happens next?</strong>
              <br />
              Our team will review your application within 1-3 business days. 
              You will receive a notification once a decision has been made.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 w-full">
          {onViewApplications && (
            <Button
              onClick={onViewApplications}
              className="bg-[#7C3AED] text-white hover:bg-[#6D28D9] px-12 h-12 w-full"
            >
              {messages.buttonText}
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="outline"
            className="px-12 h-12 w-full"
          >
            Close
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
