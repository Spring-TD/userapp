"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, RefreshCw, Users, ChevronRight, MoreVertical } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { accountService, Customer } from "@/lib/accountService"
import { toast } from "sonner"

// Fallback mock customers data - used when API is unavailable
const FALLBACK_CUSTOMERS: Customer[] = [
    {
        id: "cust-001",
        name: "John Doe",
        email: "john.doe@email.com",
        phone: "+1 234 567 8901",
        status: "active",
        totalApplications: 3,
        createdAt: "2024-01-15T10:00:00Z",
    },
    {
        id: "cust-002",
        name: "Sarah Johnson",
        email: "sarah.johnson@email.com",
        phone: "+1 234 567 8902",
        status: "active",
        totalApplications: 5,
        createdAt: "2024-02-20T14:30:00Z",
    },
    {
        id: "cust-003",
        name: "Michael Brown",
        email: "michael.brown@email.com",
        phone: "+1 234 567 8903",
        status: "inactive",
        totalApplications: 1,
        createdAt: "2024-03-10T09:15:00Z",
    },
    {
        id: "cust-004",
        name: "Emily Davis",
        email: "emily.davis@email.com",
        phone: "+1 234 567 8904",
        status: "active",
        totalApplications: 7,
        createdAt: "2023-11-05T16:45:00Z",
    },
    {
        id: "cust-005",
        name: "David Wilson",
        email: "david.wilson@email.com",
        phone: "+1 234 567 8905",
        status: "pending",
        totalApplications: 2,
        createdAt: "2024-04-01T11:00:00Z",
    },
    {
        id: "cust-006",
        name: "Jessica Martinez",
        email: "jessica.martinez@email.com",
        phone: "+1 234 567 8906",
        status: "active",
        totalApplications: 4,
        createdAt: "2024-01-28T08:20:00Z",
    },
]

export default function CustomersPage() {
    const router = useRouter()
    const [customers, setCustomers] = useState<Customer[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [usingFallback, setUsingFallback] = useState(false)

    // Fetch customers from API
    const fetchCustomers = async () => {
        setIsLoading(true)
        try {
            // Try to fetch from API first
            const response = await accountService.customers.getAll()

            if (response.success && response.data) {
                setCustomers(response.data)
                setUsingFallback(false)
            } else {
                // Fallback to mock data if API fails
                console.warn("API returned error, using fallback data:", response.error)
                setCustomers(FALLBACK_CUSTOMERS)
                setUsingFallback(true)
            }
        } catch (error) {
            console.error("Failed to fetch customers:", error)
            // Use fallback data
            setCustomers(FALLBACK_CUSTOMERS)
            setUsingFallback(true)
            toast.info("Using demo data - API unavailable")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchCustomers()
    }, [])

    // Filter customers based on search query
    const filteredCustomers = customers.filter(
        (customer) =>
            customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (customer.phone && customer.phone.includes(searchQuery))
    )

    // Navigate to customer applications
    const handleCustomerClick = (customerId: string) => {
        router.push(`/dashboard/merchant/customer/${customerId}/applications`)
    }

    // Get status badge styling
    const getStatusBadge = (status: Customer["status"]) => {
        switch (status) {
            case "active":
                return "bg-green-100 text-green-700"
            case "inactive":
                return "bg-gray-100 text-gray-700"
            case "pending":
                return "bg-yellow-100 text-yellow-700"
            default:
                return "bg-gray-100 text-gray-700"
        }
    }

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
    }

    // Generate avatar initials
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Customers</h1>
                    <p className="text-muted-foreground">
                        Manage and view all your customers
                        {usingFallback && <span className="text-amber-600 ml-2">(Demo Mode)</span>}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchCustomers}
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
                    <p className="text-sm text-gray-500">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">Active</p>
                    <p className="text-2xl font-bold text-green-600">
                        {customers.filter((c) => c.status === "active").length}
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">Inactive</p>
                    <p className="text-2xl font-bold text-gray-600">
                        {customers.filter((c) => c.status === "inactive").length}
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-sm text-gray-500">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">
                        {customers.filter((c) => c.status === "pending").length}
                    </p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search customers by name, email, or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Customers List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Users className="h-12 w-12 text-gray-300 mb-4" />
                        <p className="text-gray-500">No customers found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredCustomers.map((customer) => (
                            <div
                                key={customer.id}
                                onClick={() => handleCustomerClick(customer.id)}
                                className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-white font-medium">
                                        {getInitials(customer.name)}
                                    </div>

                                    {/* Info */}
                                    <div>
                                        <h3 className="font-medium text-gray-900 group-hover:text-black">
                                            {customer.name}
                                        </h3>
                                        <p className="text-sm text-gray-500">{customer.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    {/* Status Badge */}
                                    <span
                                        className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(
                                            customer.status
                                        )}`}
                                    >
                                        {customer.status}
                                    </span>

                                    {/* Applications Count */}
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900">
                                            {customer.totalApplications || 0}
                                        </p>
                                        <p className="text-xs text-gray-500">Applications</p>
                                    </div>

                                    {/* Join Date */}
                                    <div className="text-right hidden md:block">
                                        <p className="text-sm text-gray-500">Joined</p>
                                        <p className="text-sm font-medium text-gray-700">
                                            {formatDate(customer.createdAt)}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={(e) => {
                                                e.stopPropagation()
                                                handleCustomerClick(customer.id)
                                            }}>
                                                View Applications
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                                Edit Customer
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-red-600"
                                            >
                                                Deactivate
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Arrow */}
                                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
