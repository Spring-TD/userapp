"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Search,
    RefreshCw,
    Filter,
    CheckCircle2,
    XCircle,
    Clock,
    FileText,
    DollarSign,
    Building,
    ChevronRight,
    MoreVertical
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { accountService, ProductApplication } from "@/lib/accountService"
import ApplicationDetailDrawer from "@/components/drawers/application-detail-drawer"
import { toast } from "sonner"

// Fallback mock applications
const FALLBACK_APPLICATIONS: ProductApplication[] = [
    {
        id: "app-001",
        userId: "cust-001",
        productId: "prod-001",
        merchantId: "merchant-001",
        applicationType: "loan",
        status: "pending",
        applicationData: { amount: 25000, term: 12, purpose: "Business expansion" },
        submittedAt: "2023-10-25T10:00:00.000Z",
        createdAt: "2023-10-25T10:00:00.000Z",
        updatedAt: "2023-10-25T10:00:00.000Z",
    },
    {
        id: "app-002",
        userId: "cust-002",
        productId: "prod-002",
        merchantId: "merchant-001",
        applicationType: "mortgage",
        status: "under_review",
        applicationData: { amount: 350000, term: 25, propertyType: "Residential" },
        submittedAt: "2023-10-20T14:30:00.000Z",
        createdAt: "2023-10-20T14:30:00.000Z",
        updatedAt: "2023-10-22T09:15:00.000Z",
    },
    {
        id: "app-003",
        userId: "cust-003",
        productId: "prod-003",
        merchantId: "merchant-001",
        applicationType: "savings",
        status: "approved",
        applicationData: { amount: 10000, term: 12 },
        submittedAt: "2023-10-15T08:45:00.000Z",
        reviewedAt: "2023-10-17T11:20:00.000Z",
        createdAt: "2023-10-15T08:45:00.000Z",
        updatedAt: "2023-10-17T11:20:00.000Z",
    },
    {
        id: "app-004",
        userId: "cust-004",
        productId: "prod-004",
        merchantId: "merchant-001",
        applicationType: "commodity",
        status: "rejected",
        applicationData: { amount: 5000, quantity: 2 },
        rejectionReason: "Insufficient documentation provided",
        submittedAt: "2023-10-10T16:50:00.000Z",
        reviewedAt: "2023-10-13T09:30:00.000Z",
        createdAt: "2023-10-10T16:50:00.000Z",
        updatedAt: "2023-10-13T09:30:00.000Z",
    },
    {
        id: "app-005",
        userId: "cust-001",
        productId: "prod-001",
        merchantId: "merchant-001",
        applicationType: "loan",
        status: "pending",
        applicationData: { amount: 15000, term: 6, purpose: "Personal expenses" },
        submittedAt: "2023-10-26T11:15:00.000Z",
        createdAt: "2023-10-26T11:15:00.000Z",
        updatedAt: "2023-10-26T11:15:00.000Z",
    },
    {
        id: "app-006",
        userId: "cust-005",
        productId: "prod-002",
        merchantId: "merchant-001",
        applicationType: "mortgage",
        status: "pending",
        applicationData: { amount: 500000, term: 30, propertyType: "Commercial" },
        submittedAt: "2023-10-24T13:45:00.000Z",
        createdAt: "2023-10-24T13:45:00.000Z",
        updatedAt: "2023-10-24T13:45:00.000Z",
    },
]

const MOCK_CUSTOMER_NAMES: Record<string, string> = {
    "cust-001": "Sarah Wilson",
    "cust-002": "Michael Chen",
    "cust-003": "Emma Rodriguez",
    "cust-004": "James Thompson",
    "cust-005": "David Kim",
}

export default function ApplicationsPage() {
    const router = useRouter()
    const [applications, setApplications] = useState<ProductApplication[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [typeFilter, setTypeFilter] = useState<string>("all")
    const [usingFallback, setUsingFallback] = useState(false)

    // Drawer state
    const [selectedApplication, setSelectedApplication] = useState<ProductApplication | null>(null)
    const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)

    // Fetch applications from API
    const fetchApplications = async () => {
        setIsLoading(true)
        try {
            const response = await accountService.applications.getAll()

            if (response.success && response.data) {
                setApplications(response.data)
                setUsingFallback(false)
            } else {
                console.warn("API returned error, using fallback data:", response.error)
                setApplications(FALLBACK_APPLICATIONS)
                setUsingFallback(true)
            }
        } catch (error) {
            console.error("Failed to fetch applications:", error)
            setApplications(FALLBACK_APPLICATIONS)
            setUsingFallback(true)
            toast.info("Using demo data - API unavailable")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchApplications()
    }, [])

    // Filter applications
    const filteredApplications = applications.filter((app) => {
        const matchesSearch =
            app.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.applicationType.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = statusFilter === "all" || app.status === statusFilter
        const matchesType = typeFilter === "all" || app.applicationType === typeFilter

        return matchesSearch && matchesStatus && matchesType
    })

    // Stats
    const stats = {
        total: applications.length,
        pending: applications.filter(a => a.status === "pending" || a.status === "under_review").length,
        approved: applications.filter(a => a.status === "approved").length,
        rejected: applications.filter(a => a.status === "rejected").length,
    }

    // Open application detail
    const handleViewApplication = (application: ProductApplication) => {
        setSelectedApplication(application)
        setIsDetailDrawerOpen(true)
    }

    // Handle status change (after approve/reject)
    const handleStatusChange = () => {
        fetchApplications()
    }

    // Get status badge
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Approved
                    </span>
                )
            case "rejected":
                return (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <XCircle className="h-3 w-3" />
                        Rejected
                    </span>
                )
            case "under_review":
                return (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        <Clock className="h-3 w-3" />
                        Under Review
                    </span>
                )
            case "pending":
            default:
                return (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                        <Clock className="h-3 w-3" />
                        Pending
                    </span>
                )
        }
    }

    // Get type icon
    const getTypeIcon = (type: string) => {
        switch (type) {
            case "loan":
                return <DollarSign className="h-4 w-4 text-purple-600" />
            case "mortgage":
                return <Building className="h-4 w-4 text-blue-600" />
            case "savings":
                return <DollarSign className="h-4 w-4 text-green-600" />
            case "commodity":
                return <FileText className="h-4 w-4 text-amber-600" />
            default:
                return <FileText className="h-4 w-4 text-gray-600" />
        }
    }

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        })
    }

    // Format currency
    const formatCurrency = (amount: number | undefined) => {
        if (!amount) return "N/A"
        return `$${amount.toLocaleString()}`
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Applications</h1>
                    <p className="text-muted-foreground">
                        Review and manage customer applications
                        {usingFallback && <span className="text-amber-600 ml-2">(Demo Mode)</span>}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/dashboard/merchant/applications/pending")}
                        className="gap-2"
                    >
                        <Clock className="h-4 w-4" />
                        Pending ({stats.pending})
                    </Button>
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
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">Total Applications</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">Pending Review</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">Approved</p>
                    <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">Rejected</p>
                    <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search by ID, user, or type..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="loan">Loan</SelectItem>
                        <SelectItem value="mortgage">Mortgage</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="commodity">Commodity</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Applications Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                ) : filteredApplications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <FileText className="h-12 w-12 text-gray-300 mb-4" />
                        <p className="text-gray-500">No applications found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Customer
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Reference
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Submitted
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredApplications.map((application) => {
                                    const customerName = MOCK_CUSTOMER_NAMES[application.userId] || `User ${application.userId?.slice(0, 4)}`
                                    const initials = customerName.split(' ').map(n => n[0]).join('')

                                    return (
                                        <tr
                                            key={application.id}
                                            className="hover:bg-purple-50/50 cursor-pointer transition-colors group"
                                            onClick={() => handleViewApplication(application)}
                                        >
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-700 to-black flex items-center justify-center text-sm font-bold text-white shadow-sm ring-2 ring-white">
                                                        {initials}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibdold text-gray-900 group-hover:text-purple-700 transition-colors">{customerName}</span>
                                                        <span className="text-xs text-gray-500 font-mono">{application.userId}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                        {getTypeIcon(application.applicationType)}
                                                    </div>
                                                    <span className="font-medium text-gray-700 capitalize">
                                                        {application.applicationType}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <span className="text-sm text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded">
                                                    {application.id.slice(0, 8).toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <span className="font-bold text-gray-900 text-base">
                                                    {formatCurrency(application.applicationData?.amount)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                {getStatusBadge(application.status)}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-gray-900 font-medium">
                                                        {formatDate(application.submittedAt || application.createdAt).split(',')[0]}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {formatDate(application.submittedAt || application.createdAt).split(',')[1]}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-200 rounded-full">
                                                            <MoreVertical className="h-4 w-4 text-gray-500" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleViewApplication(application)
                                                        }}>
                                                            <FileText className="mr-2 h-4 w-4" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        {(application.status === "pending" || application.status === "under_review") && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleViewApplication(application)
                                                                    }}
                                                                    className="text-green-600 focus:text-green-700 focus:bg-green-50"
                                                                >
                                                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                                                    Approve
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleViewApplication(application)
                                                                    }}
                                                                    className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                                                >
                                                                    <XCircle className="mr-2 h-4 w-4" />
                                                                    Reject
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
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
