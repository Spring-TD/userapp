"use client"

import { useState } from "react"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import { accountService, ProductApplication } from "@/lib/services/accountService"
import {
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
    FileText,
    User,
    Calendar,
    DollarSign,
    Building,
    AlertTriangle
} from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CustomerAccountsTab from "@/components/customer-accounts-tab"

interface ApplicationDetailDrawerProps {
    isOpen: boolean
    onClose: () => void
    application: ProductApplication | null
    onStatusChange: () => void
}

export default function ApplicationDetailDrawer({
    isOpen,
    onClose,
    application,
    onStatusChange,
}: ApplicationDetailDrawerProps) {
    const [isApproving, setIsApproving] = useState(false)
    const [isRejecting, setIsRejecting] = useState(false)
    const [rejectionReason, setRejectionReason] = useState("")
    const [showRejectForm, setShowRejectForm] = useState(false)

    if (!application) return null

    const handleApprove = async () => {
        setIsApproving(true)
        try {
            const result = await accountService.applications.approve(application.id)

            if (result.success) {
                toast.success("Application approved successfully!")
                onStatusChange()
                onClose()
            } else {
                toast.error(result.error || "Failed to approve application")
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to approve application")
        } finally {
            setIsApproving(false)
        }
    }

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            toast.error("Please provide a reason for rejection")
            return
        }

        setIsRejecting(true)
        try {
            const result = await accountService.applications.reject(application.id, rejectionReason)

            if (result.success) {
                toast.success("Application rejected")
                onStatusChange()
                onClose()
            } else {
                toast.error(result.error || "Failed to reject application")
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to reject application")
        } finally {
            setIsRejecting(false)
            setShowRejectForm(false)
            setRejectionReason("")
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Approved
                    </span>
                )
            case "rejected":
                return (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-700">
                        <XCircle className="h-4 w-4" />
                        Rejected
                    </span>
                )
            case "under_review":
                return (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                        <Clock className="h-4 w-4" />
                        Under Review
                    </span>
                )
            case "pending":
            default:
                return (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
                        <Clock className="h-4 w-4" />
                        Pending
                    </span>
                )
        }
    }

    const getApplicationTypeIcon = (type: string) => {
        switch (type) {
            case "loan":
                return <DollarSign className="h-5 w-5" />
            case "mortgage":
                return <Building className="h-5 w-5" />
            case "savings":
                return <DollarSign className="h-5 w-5" />
            case "commodity":
                return <FileText className="h-5 w-5" />
            case "investment":
                return <DollarSign className="h-5 w-5" />
            default:
                return <FileText className="h-5 w-5" />
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    const formatCurrency = (amount: number | undefined, currency = "USD") => {
        if (!amount) return "N/A"
        const symbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : "₦"
        return `${symbol}${amount.toLocaleString()}`
    }

    const isPending = application.status === "pending" || application.status === "under_review"

    const customerName = {
        "cust-001": "Sarah Wilson",
        "cust-002": "Michael Chen",
        "cust-003": "Emma Rodriguez",
        "cust-004": "James Thompson",
        "cust-005": "David Kim"
    }[application.userId] || `User ${application.userId?.slice(0, 4)}`

    return (
        <Drawer
            open={isOpen}
            onOpenChange={onClose}
            title="Overview"
            subtitle="Application & Customer Details"
            className="sm:max-w-[1000px]"
        >
            <div className="space-y-6 px-6">
                {/* Customer Profile Header */}
                <div className="flex items-start justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-[#1e293b] flex items-center justify-center text-xl font-bold text-white border-4 border-white shadow-sm">
                            {customerName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-bold text-gray-900">{customerName}</h3>
                                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    KYC Verified
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                <User className="h-3.5 w-3.5" />
                                ID: {application.userId}
                            </p>
                            <p className="text-sm text-gray-500 mt-0.5">
                                123 Main St, New York, NY 10001
                            </p>
                        </div>
                    </div>
                    {getStatusBadge(application.status)}
                </div>

                {/* Tabs */}
                <Tabs defaultValue="application" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="application">Application Details</TabsTrigger>
                        <TabsTrigger value="portfolio">Transactions & Portfolio</TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Application Details */}
                    <TabsContent value="application" className="space-y-6 mt-0">
                        {/* Application Type Card */}
                        <div className="bg-gradient-to-r from-gray-800 to-black text-white p-6 rounded-xl shadow-md">
                            <div className="flex items-center gap-3 mb-4">
                                {getApplicationTypeIcon(application.applicationType)}
                                <span className="text-lg font-semibold capitalize">
                                    {application.applicationType} Application
                                </span>
                            </div>
                            <p className="text-3xl font-bold">
                                {formatCurrency(application.applicationData?.amount)}
                            </p>
                            <p className="text-gray-300 text-sm mt-1 flex items-center gap-2">
                                Reference: <span className="font-mono bg-white/10 px-2 py-0.5 rounded">{application.id?.slice(0, 8).toUpperCase() || "N/A"}</span>
                            </p>
                        </div>

                        {/* Application Information */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
                            <h3 className="font-semibold text-gray-900 mb-2 border-b border-gray-100 pb-2">Application Details</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-sm text-gray-500 block mb-1">Product ID</span>
                                    <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                        <FileText className="h-3.5 w-3.5" />
                                        {application.productId?.slice(0, 12) || "N/A"}...
                                    </span>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500 block mb-1">Submitted Date</span>
                                    <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {formatDate(application.submittedAt || application.createdAt)}
                                    </span>
                                </div>
                                {application.applicationData?.term && (
                                    <div>
                                        <span className="text-sm text-gray-500 block mb-1">Term</span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {application.applicationData.term} {application.applicationType === "mortgage" ? "years" : "months"}
                                        </span>
                                    </div>
                                )}
                                {application.applicationData?.purpose && (
                                    <div className="col-span-2">
                                        <span className="text-sm text-gray-500 block mb-1">Purpose</span>
                                        <span className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg block">
                                            {application.applicationData.purpose}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Rejection Reason */}
                        {application.status === "rejected" && application.rejectionReason && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-red-700">Rejection Reason</h4>
                                        <p className="text-sm text-red-600 mt-1">{application.rejectionReason}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Rejection Form */}
                        {showRejectForm && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                                <h4 className="font-medium text-red-700">Provide Rejection Reason</h4>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Enter the reason for rejecting this application..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setShowRejectForm(false)
                                            setRejectionReason("")
                                        }}
                                        disabled={isRejecting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleReject}
                                        disabled={isRejecting || !rejectionReason.trim()}
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        {isRejecting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Rejecting...
                                            </>
                                        ) : (
                                            "Confirm Rejection"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons Removed per request */}
                    </TabsContent>

                    {/* Tab 2: Portfolio */}
                    <TabsContent value="portfolio" className="mt-0">
                        <div className="bg-white rounded-xl py-2">
                            <CustomerAccountsTab customerId={application.userId} />
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Close Button for non-pending or secondary tabs */}
                {!isPending && (
                    <Button
                        onClick={onClose}
                        className="w-full h-12 bg-black hover:bg-black/90 text-white"
                    >
                        Close
                    </Button>
                )}
            </div>
        </Drawer>
    )
}
