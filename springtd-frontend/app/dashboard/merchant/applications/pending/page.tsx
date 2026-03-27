"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    ArrowLeft,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Clock,
    FileText,
    DollarSign,
    Building,
    AlertCircle,
    Timer
} from "lucide-react"
import { accountService, ProductApplication } from "@/lib/accountService"
import ApplicationDetailDrawer from "@/components/drawers/application-detail-drawer"
import { toast } from "sonner"

// Fallback mock pending applications
const FALLBACK_PENDING: ProductApplication[] = [
    {
        id: "app-001",
        userId: "cust-001",
        productId: "prod-001",
        merchantId: "merchant-001",
        applicationType: "loan",
        status: "pending",
        applicationData: { amount: 25000, term: 12, purpose: "Business expansion" },
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: "app-002",
        userId: "cust-002",
        productId: "prod-002",
        merchantId: "merchant-001",
        applicationType: "mortgage",
        status: "under_review",
        applicationData: { amount: 350000, term: 25, propertyType: "Residential" },
        submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: "app-005",
        userId: "cust-001",
        productId: "prod-001",
        merchantId: "merchant-001",
        applicationType: "loan",
        status: "pending",
        applicationData: { amount: 15000, term: 6, purpose: "Personal expenses" },
        submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: "app-006",
        userId: "cust-005",
        productId: "prod-002",
        merchantId: "merchant-001",
        applicationType: "mortgage",
        status: "pending",
        applicationData: { amount: 500000, term: 30, propertyType: "Commercial" },
        submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
]

export default function PendingApplicationsPage() {
    const router = useRouter()
    const [applications, setApplications] = useState<ProductApplication[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [usingFallback, setUsingFallback] = useState(false)

    // Drawer state
    const [selectedApplication, setSelectedApplication] = useState<ProductApplication | null>(null)
    const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)

    // Fetch pending applications from API
    const fetchApplications = async () => {
        setIsLoading(true)
        try {
            const response = await accountService.applications.getPending()

            if (response.success && response.data) {
                setApplications(response.data)
                setUsingFallback(false)
            } else {
                console.warn("API returned error, using fallback data:", response.error)
                setApplications(FALLBACK_PENDING)
                setUsingFallback(true)
            }
        } catch (error) {
            console.error("Failed to fetch pending applications:", error)
            setApplications(FALLBACK_PENDING)
            setUsingFallback(true)
            toast.info("Using demo data - API unavailable")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchApplications()
    }, [])

    // Handle view application
    const handleViewApplication = (application: ProductApplication) => {
        setSelectedApplication(application)
        setIsDetailDrawerOpen(true)
    }

    // Handle status change
    const handleStatusChange = () => {
        fetchApplications()
    }

    // Get type icon and color
    const getTypeConfig = (type: string) => {
        switch (type) {
            case "loan":
                return {
                    icon: <DollarSign className="h-6 w-6" />,
                    bg: "bg-purple-100",
                    text: "text-purple-600",
                    label: "Loan Application"
                }
            case "mortgage":
                return {
                    icon: <Building className="h-6 w-6" />,
                    bg: "bg-blue-100",
                    text: "text-blue-600",
                    label: "Mortgage Application"
                }
            case "savings":
                return {
                    icon: <DollarSign className="h-6 w-6" />,
                    bg: "bg-green-100",
                    text: "text-green-600",
                    label: "Savings Account"
                }
            case "commodity":
                return {
                    icon: <FileText className="h-6 w-6" />,
                    bg: "bg-amber-100",
                    text: "text-amber-600",
                    label: "Commodity Purchase"
                }
            default:
                return {
                    icon: <FileText className="h-6 w-6" />,
                    bg: "bg-gray-100",
                    text: "text-gray-600",
                    label: "Application"
                }
        }
    }

    // Format time ago
    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

        if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
        } else if (diffHours > 0) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
        } else {
            return "Just now"
        }
    }

    // Format currency
    const formatCurrency = (amount: number | undefined) => {
        if (!amount) return "N/A"
        return `$${amount.toLocaleString()}`
    }

    // Get urgency level
    const getUrgency = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays >= 7) return "high"
        if (diffDays >= 3) return "medium"
        return "normal"
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/dashboard/merchant/applications")}
                        className="mb-2 -ml-2 gap-2 text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to All Applications
                    </Button>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <Clock className="h-8 w-8 text-yellow-500" />
                        Pending Applications
                    </h1>
                    <p className="text-muted-foreground">
                        Applications awaiting your review
                        {usingFallback && <span className="text-amber-600 ml-2">(Demo Mode)</span>}
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchApplications}
                    className="gap-2"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Alert Banner */}
            {applications.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                        <h3 className="font-medium text-yellow-800">
                            {applications.length} application{applications.length > 1 ? 's' : ''} pending review
                        </h3>
                        <p className="text-sm text-yellow-700 mt-1">
                            Review and process these applications to improve customer experience.
                        </p>
                    </div>
                </div>
            )}

            {/* Applications Queue */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                ) : applications.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">All caught up!</h3>
                        <p className="text-gray-500">There are no pending applications to review.</p>
                        <Button
                            onClick={() => router.push("/dashboard/merchant/applications")}
                            className="mt-6 bg-black hover:bg-black/90 text-white"
                        >
                            View All Applications
                        </Button>
                    </div>
                ) : (
                    applications.map((application) => {
                        const typeConfig = getTypeConfig(application.applicationType)
                        const urgency = getUrgency(application.submittedAt || application.createdAt)

                        return (
                            <div
                                key={application.id}
                                onClick={() => handleViewApplication(application)}
                                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 cursor-pointer transition-all group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        {/* Type Icon */}
                                        <div className={`w-14 h-14 rounded-xl ${typeConfig.bg} ${typeConfig.text} flex items-center justify-center`}>
                                            {typeConfig.icon}
                                        </div>

                                        {/* Details */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-gray-900 group-hover:text-black">
                                                    {typeConfig.label}
                                                </h3>
                                                {urgency === "high" && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                        <Timer className="h-3 w-3" />
                                                        Urgent
                                                    </span>
                                                )}
                                                {urgency === "medium" && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                                        <Timer className="h-3 w-3" />
                                                        Needs Attention
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 mb-2">
                                                Reference: <span className="font-mono">{application.id.slice(0, 8).toUpperCase()}</span>
                                            </p>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-gray-600">
                                                    Amount: <span className="font-semibold text-gray-900">{formatCurrency(application.applicationData?.amount)}</span>
                                                </span>
                                                {application.applicationData?.term && (
                                                    <span className="text-gray-600">
                                                        Term: <span className="font-medium">{application.applicationData.term} {application.applicationType === "mortgage" ? "years" : "months"}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side */}
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500 mb-2">
                                            Submitted {getTimeAgo(application.submittedAt || application.createdAt)}
                                        </p>
                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleViewApplication(application)
                                                }}
                                                className="border-red-300 text-red-600 hover:bg-red-50"
                                            >
                                                <XCircle className="h-4 w-4 mr-1" />
                                                Reject
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleViewApplication(application)
                                                }}
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                                Approve
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Application Detail Drawer */}
            <ApplicationDetailDrawer
                isOpen={isDetailDrawerOpen}
                onClose={() => {
                    setIsDetailDrawerOpen(false)
                    setSelectedApplication(null)
                }}
                application={selectedApplication}
                onStatusChange={handleStatusChange}
            />
        </div>
    )
}
