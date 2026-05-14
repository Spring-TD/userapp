"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw, ArrowLeft, User, Wallet, FileText } from "lucide-react"
import UserApplicationsTable from "@/components/user-applications-table"
import LoanApplicationDrawer from "@/components/drawers/loan-application-drawer"
import SavingsApplicationDrawer from "@/components/drawers/savings-application-drawer"
import MortgageApplicationDrawer from "@/components/drawers/mortgage-application-drawer"
import CommodityPurchaseDrawer from "@/components/drawers/commodity-purchase-drawer"
import ApplicationSuccessDrawer from "@/components/drawers/application-success-drawer"
import NewApplicationDrawer from "@/components/drawers/new-application-drawer"
import CustomerAccountsTab from "@/components/customer-accounts-tab"
import { accountService, Customer, ProductApplication } from "@/lib/accountService"
import { toast } from "sonner"

interface Application {
    id: string
    productName: string
    productType: "loan" | "mortgage" | "savings" | "commodity"
    status: "pending" | "under_review" | "approved" | "rejected"
    amount: number
    currency: string
    submittedAt: string
    reviewedAt?: string
    reference?: string
}

// Mock products for demonstration
const MOCK_PRODUCTS = {
    loans: [
        { id: "loan-1", name: "Personal Loan", interestRate: 12.5, minAmount: 1000, maxAmount: 50000 },
    ],
    savings: [
        { id: "savings-1", name: "High-Yield Savings", interestRate: 5.5, minDeposit: 100 },
    ],
    mortgages: [
        { id: "mortgage-1", name: "Home Mortgage", interestRate: 6.5, maxLTV: 80 },
    ],
    commodities: [
        { id: "commodity-1", name: "Gold", symbol: "XAU", currentPrice: 2350 },
    ],
}

// Fallback mock customers data
const FALLBACK_CUSTOMERS: Record<string, Customer> = {
    "cust-001": { id: "cust-001", name: "John Doe", email: "john.doe@email.com", phone: "+1 234 567 8901", status: "active", createdAt: "2024-01-15T10:00:00Z" },
    "cust-002": { id: "cust-002", name: "Sarah Johnson", email: "sarah.johnson@email.com", phone: "+1 234 567 8902", status: "active", createdAt: "2024-02-20T14:30:00Z" },
    "cust-003": { id: "cust-003", name: "Michael Brown", email: "michael.brown@email.com", phone: "+1 234 567 8903", status: "inactive", createdAt: "2024-03-10T09:15:00Z" },
    "cust-004": { id: "cust-004", name: "Emily Davis", email: "emily.davis@email.com", phone: "+1 234 567 8904", status: "active", createdAt: "2023-11-05T16:45:00Z" },
    "cust-005": { id: "cust-005", name: "David Wilson", email: "david.wilson@email.com", phone: "+1 234 567 8905", status: "pending", createdAt: "2024-04-01T11:00:00Z" },
    "cust-006": { id: "cust-006", name: "Jessica Martinez", email: "jessica.martinez@email.com", phone: "+1 234 567 8906", status: "active", createdAt: "2024-01-28T08:20:00Z" },
}

// Fallback mock applications
const FALLBACK_APPLICATIONS: Record<string, Application[]> = {
    "cust-001": [
        { id: "app-001", productName: "Personal Loan", productType: "loan", status: "approved", amount: 25000, currency: "USD", submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), reference: "LN-2024-001" },
        { id: "app-002", productName: "High-Yield Savings", productType: "savings", status: "approved", amount: 10000, currency: "USD", submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), reference: "SV-2024-001" },
        { id: "app-003", productName: "Home Mortgage", productType: "mortgage", status: "under_review", amount: 350000, currency: "USD", submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), reference: "MG-2024-001" },
    ],
    "cust-002": [
        { id: "app-004", productName: "Business Loan", productType: "loan", status: "approved", amount: 75000, currency: "USD", submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), reference: "LN-2024-002" },
    ],
    "cust-003": [
        { id: "app-009", productName: "High-Yield Savings", productType: "savings", status: "approved", amount: 5000, currency: "USD", submittedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), reference: "SV-2024-003" },
    ],
    "cust-004": [
        { id: "app-010", productName: "Home Mortgage", productType: "mortgage", status: "approved", amount: 450000, currency: "USD", submittedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), reference: "MG-2024-003" },
    ],
    "cust-005": [
        { id: "app-017", productName: "Personal Loan", productType: "loan", status: "pending", amount: 10000, currency: "USD", submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), reference: "LN-2024-006" },
    ],
    "cust-006": [
        { id: "app-019", productName: "Home Mortgage", productType: "mortgage", status: "approved", amount: 320000, currency: "USD", submittedAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(), reference: "MG-2024-004" },
    ],
}

const transformApiApplication = (apiApp: ProductApplication): Application => {
    return {
        id: apiApp.id,
        productName: apiApp.applicationData?.productName || "Unknown Product",
        productType: apiApp.applicationType as Application["productType"],
        status: apiApp.status as Application["status"],
        amount: apiApp.applicationData?.amount || 0,
        currency: apiApp.applicationData?.currency || "USD",
        submittedAt: apiApp.submittedAt || apiApp.createdAt,
        reviewedAt: apiApp.reviewedAt,
        reference: apiApp.applicationData?.reference || apiApp.id,
    }
}

export default function CustomerApplicationsPage() {
    const params = useParams()
    const router = useRouter()
    const customerId = params.customerId as string

    const [mainTab, setMainTab] = useState<"applications" | "accounts">("applications")
    const [activeTab, setActiveTab] = useState("all")
    const [applications, setApplications] = useState<Application[]>([])
    const [customer, setCustomer] = useState<Customer | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [selectedProduct, setSelectedProduct] = useState<any>(null)
    const [usingFallback, setUsingFallback] = useState(false)

    const [drawers, setDrawers] = useState({
        newApplication: false,
        loanApplication: false,
        savingsApplication: false,
        mortgageApplication: false,
        commodityPurchase: false,
        success: false,
    })

    const [successDetails, setSuccessDetails] = useState<{
        type: "loan" | "savings" | "mortgage" | "commodity"
        applicationId?: string
    } | null>(null)

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const customerResponse = await accountService.customers.getById(customerId)
            if (customerResponse.success && customerResponse.data) {
                setCustomer(customerResponse.data)
            } else {
                const fallbackCustomer = FALLBACK_CUSTOMERS[customerId]
                setCustomer(fallbackCustomer || null)
                setUsingFallback(true)
            }

            const applicationsResponse = await accountService.customers.getApplications(customerId)
            if (applicationsResponse.success && applicationsResponse.data) {
                setApplications(applicationsResponse.data.map(transformApiApplication))
            } else {
                setApplications(FALLBACK_APPLICATIONS[customerId] || [])
                setUsingFallback(true)
            }
        } catch (error) {
            console.error("Failed to fetch data:", error)
            setCustomer(FALLBACK_CUSTOMERS[customerId] || null)
            setApplications(FALLBACK_APPLICATIONS[customerId] || [])
            setUsingFallback(true)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (customerId) fetchData()
    }, [customerId])

    const openDrawer = (drawer: keyof typeof drawers) => setDrawers((prev) => ({ ...prev, [drawer]: true }))
    const closeDrawer = (drawer: keyof typeof drawers) => setDrawers((prev) => ({ ...prev, [drawer]: false }))

    const handleApplicationSuccess = (type: "loan" | "savings" | "mortgage" | "commodity", applicationId?: string) => {
        setSuccessDetails({ type, applicationId })
        openDrawer("success")
        fetchData()
        toast.success("Application submitted successfully!")
    }

    const handleViewDetails = (application: Application) => {
        toast.info(`Viewing details for ${application.productName}`)
    }

    const filterByType = (type: string) => {
        if (type === "all") return applications
        return applications.filter((app) => app.productType === type)
    }

    const handleSelectApplicationType = (type: "loan" | "savings" | "mortgage" | "commodity") => {
        switch (type) {
            case "loan": setSelectedProduct(MOCK_PRODUCTS.loans[0]); openDrawer("loanApplication"); break
            case "savings": setSelectedProduct(MOCK_PRODUCTS.savings[0]); openDrawer("savingsApplication"); break
            case "mortgage": setSelectedProduct(MOCK_PRODUCTS.mortgages[0]); openDrawer("mortgageApplication"); break
            case "commodity": setSelectedProduct(MOCK_PRODUCTS.commodities[0]); openDrawer("commodityPurchase"); break
        }
    }

    const getStatusBadge = (status: Customer["status"]) => {
        switch (status) {
            case "active": return "bg-green-100 text-green-700"
            case "inactive": return "bg-gray-100 text-gray-700"
            case "pending": return "bg-yellow-100 text-yellow-700"
            default: return "bg-gray-100 text-gray-700"
        }
    }

    const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

    if (!customer && !isLoading) {
        return (
            <div className="p-8">
                <div className="flex flex-col items-center justify-center py-20">
                    <User className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-4">Customer not found</p>
                    <Button onClick={() => router.push("/dashboard/merchant/customer")}>Back to Customers</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8">
            {/* Back Button */}
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/merchant/customer")} className="mb-6 -ml-2 gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4" />
                Back to Customers
            </Button>

            {/* Customer Info Card */}
            {customer && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-white text-xl font-medium">
                            {getInitials(customer.name)}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-semibold text-gray-900">{customer.name}</h2>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(customer.status)}`}>
                                    {customer.status}
                                </span>
                                {usingFallback && <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">Demo Mode</span>}
                            </div>
                            <p className="text-gray-500">{customer.email}</p>
                            <p className="text-sm text-gray-400">{customer.phone}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Navigation Tabs */}
            <div className="flex gap-8 mb-8 border-b border-gray-200">
                <button
                    onClick={() => setMainTab("applications")}
                    className={`flex items-center gap-2 pb-3 font-medium transition-all border-b-2 -mb-px ${mainTab === "applications"
                            ? "border-[#7C3AED] text-[#7C3AED]"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                >
                    <FileText className="h-4 w-4" />
                    Applications
                </button>
                <button
                    onClick={() => setMainTab("accounts")}
                    className={`flex items-center gap-2 pb-3 font-medium transition-all border-b-2 -mb-px ${mainTab === "accounts"
                            ? "border-[#7C3AED] text-[#7C3AED]"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                >
                    <Wallet className="h-4 w-4" />
                    Accounts
                </button>
            </div>

            {/* Applications Tab Content */}
            {mainTab === "applications" && (
                <>
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Applications</h1>
                            <p className="text-muted-foreground">{customer ? `${customer.name}'s financial product applications` : "Loading..."}</p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Refresh
                            </Button>
                            <Button onClick={() => openDrawer("newApplication")} className="bg-black hover:bg-black/90 text-white gap-2">
                                <Plus className="h-4 w-4" />
                                New Application
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <p className="text-sm text-gray-500">Total Applications</p>
                            <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <p className="text-sm text-gray-500">Pending</p>
                            <p className="text-2xl font-bold text-yellow-600">{applications.filter((a) => a.status === "pending" || a.status === "under_review").length}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <p className="text-sm text-gray-500">Approved</p>
                            <p className="text-2xl font-bold text-green-600">{applications.filter((a) => a.status === "approved").length}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <p className="text-sm text-gray-500">Rejected</p>
                            <p className="text-2xl font-bold text-red-600">{applications.filter((a) => a.status === "rejected").length}</p>
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="bg-transparent p-0 h-auto border-b border-gray-200">
                            <TabsTrigger value="all" className="px-0 py-3 mr-8 rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">All Applications</TabsTrigger>
                            <TabsTrigger value="loan" className="px-0 py-3 mr-8 rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">Loans</TabsTrigger>
                            <TabsTrigger value="savings" className="px-0 py-3 mr-8 rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">Savings</TabsTrigger>
                            <TabsTrigger value="mortgage" className="px-0 py-3 mr-8 rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">Mortgages</TabsTrigger>
                            <TabsTrigger value="commodity" className="px-0 py-3 mr-8 rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none">Commodities</TabsTrigger>
                        </TabsList>

                        <TabsContent value="all"><UserApplicationsTable applications={filterByType("all")} isLoading={isLoading} onViewDetails={handleViewDetails} onRefresh={fetchData} /></TabsContent>
                        <TabsContent value="loan"><UserApplicationsTable applications={filterByType("loan")} isLoading={isLoading} onViewDetails={handleViewDetails} onRefresh={fetchData} /></TabsContent>
                        <TabsContent value="savings"><UserApplicationsTable applications={filterByType("savings")} isLoading={isLoading} onViewDetails={handleViewDetails} onRefresh={fetchData} /></TabsContent>
                        <TabsContent value="mortgage"><UserApplicationsTable applications={filterByType("mortgage")} isLoading={isLoading} onViewDetails={handleViewDetails} onRefresh={fetchData} /></TabsContent>
                        <TabsContent value="commodity"><UserApplicationsTable applications={filterByType("commodity")} isLoading={isLoading} onViewDetails={handleViewDetails} onRefresh={fetchData} /></TabsContent>
                    </Tabs>
                </>
            )}

            {/* Accounts Tab Content */}
            {mainTab === "accounts" && (
                <CustomerAccountsTab customerId={customerId} />
            )}

            {/* Drawers */}
            {selectedProduct && (
                <>
                    <LoanApplicationDrawer
                        isOpen={drawers.loanApplication}
                        onClose={() => closeDrawer("loanApplication")}
                        product={{ id: selectedProduct.id, name: selectedProduct.name, merchantId: "merchant-001", interestRate: selectedProduct.interestRate, minAmount: selectedProduct.minAmount, maxAmount: selectedProduct.maxAmount, currency: "USD" }}
                        userId={customerId}
                        onSuccess={(application) => { closeDrawer("loanApplication"); handleApplicationSuccess("loan", application?.id || application?.reference) }}
                    />
                    <SavingsApplicationDrawer
                        isOpen={drawers.savingsApplication}
                        onClose={() => closeDrawer("savingsApplication")}
                        product={{ id: selectedProduct.id, name: selectedProduct.name, merchantId: "merchant-001", interestRate: selectedProduct.interestRate, minDeposit: selectedProduct.minDeposit || 100, currency: "USD" }}
                        userId={customerId}
                        onSuccess={(account) => { closeDrawer("savingsApplication"); handleApplicationSuccess("savings", account?.id || account?.reference) }}
                    />
                    <MortgageApplicationDrawer
                        isOpen={drawers.mortgageApplication}
                        onClose={() => closeDrawer("mortgageApplication")}
                        product={{ id: selectedProduct.id, name: selectedProduct.name, merchantId: "merchant-001", interestRate: selectedProduct.interestRate, maxLTV: selectedProduct.maxLTV || 80, currency: "USD" }}
                        userId={customerId}
                        onSuccess={(application) => { closeDrawer("mortgageApplication"); handleApplicationSuccess("mortgage", application?.id || application?.reference) }}
                    />
                    <CommodityPurchaseDrawer
                        isOpen={drawers.commodityPurchase}
                        onClose={() => closeDrawer("commodityPurchase")}
                        product={{ id: selectedProduct.id, name: selectedProduct.name, merchantId: "merchant-001", commodityType: selectedProduct.symbol || "XAU", unitPrice: selectedProduct.currentPrice || 2350, currency: "USD" }}
                        userId={customerId}
                        onSuccess={(purchase) => { closeDrawer("commodityPurchase"); handleApplicationSuccess("commodity", purchase?.id || purchase?.reference) }}
                    />
                </>
            )}

            {successDetails && (
                <ApplicationSuccessDrawer
                    isOpen={drawers.success}
                    onClose={() => { closeDrawer("success"); setSuccessDetails(null) }}
                    applicationType={successDetails.type}
                    applicationId={successDetails.applicationId}
                />
            )}

            <NewApplicationDrawer
                isOpen={drawers.newApplication}
                onClose={() => closeDrawer("newApplication")}
                onSelectType={handleSelectApplicationType}
            />
        </div>
    )
}
