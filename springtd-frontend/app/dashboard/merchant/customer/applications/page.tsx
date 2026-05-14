"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw } from "lucide-react"
import UserApplicationsTable from "@/components/user-applications-table"
import LoanApplicationDrawer from "@/components/drawers/loan-application-drawer"
import SavingsApplicationDrawer from "@/components/drawers/savings-application-drawer"
import MortgageApplicationDrawer from "@/components/drawers/mortgage-application-drawer"
import CommodityPurchaseDrawer from "@/components/drawers/commodity-purchase-drawer"
import ApplicationSuccessDrawer from "@/components/drawers/application-success-drawer"
import NewApplicationDrawer from "@/components/drawers/new-application-drawer"
import { accountService, ProductApplication } from "@/lib/accountService"
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

// Mock products for the "New Application" drawers — these would come from product-ms in production
const MOCK_PRODUCTS = {
  loans: [
    { id: "loan-1", name: "Personal Loan", interestRate: 12.5, minAmount: 1000, maxAmount: 50000 },
    { id: "loan-2", name: "Business Loan", interestRate: 10.0, minAmount: 5000, maxAmount: 100000 },
  ],
  savings: [
    { id: "savings-1", name: "High-Yield Savings", interestRate: 5.5, minDeposit: 100 },
    { id: "savings-2", name: "Fixed Deposit", interestRate: 7.0, minDeposit: 1000 },
  ],
  mortgages: [
    { id: "mortgage-1", name: "Home Mortgage", interestRate: 6.5, maxLTV: 80 },
    { id: "mortgage-2", name: "Commercial Property", interestRate: 7.5, maxLTV: 70 },
  ],
  commodities: [
    { id: "commodity-1", name: "Gold", symbol: "XAU", currentPrice: 2350 },
    { id: "commodity-2", name: "Silver", symbol: "XAG", currentPrice: 28.5 },
  ],
}

/**
 * Map ProductApplication (from account-ms) → local Application shape used by UserApplicationsTable.
 */
function mapToLocalApplication(pa: ProductApplication): Application {
  return {
    id: pa.id,
    productName:
      pa.applicationData?.productName ||
      pa.applicationData?.purpose ||
      pa.applicationType.charAt(0).toUpperCase() + pa.applicationType.slice(1),
    productType: pa.applicationType === "investment" ? "commodity" : pa.applicationType as Application["productType"],
    status: pa.status,
    amount: pa.applicationData?.amount ?? 0,
    currency: pa.applicationData?.currency ?? "USD",
    submittedAt: pa.submittedAt || pa.createdAt,
    reviewedAt: pa.reviewedAt,
    reference: pa.id.slice(0, 8).toUpperCase(),
  }
}

export default function ApplicationsPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)

  // Drawer states
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

  // P2-006 fix: Fetch real applications from account-ms
  const fetchApplications = async () => {
    setIsLoading(true)
    try {
      const response = await accountService.applications.getAll()

      if (response.success && response.data) {
        setApplications(response.data.map(mapToLocalApplication))
        setUsingFallback(false)
      } else {
        console.warn("[Applications] API returned error:", response.error)
        setApplications([])
        setUsingFallback(true)
        toast.info("No applications found or API unavailable")
      }
    } catch (error) {
      console.error("Failed to fetch applications:", error)
      setApplications([])
      setUsingFallback(true)
      toast.error("Could not load applications")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  const openDrawer = (drawer: keyof typeof drawers) => {
    setDrawers((prev) => ({ ...prev, [drawer]: true }))
  }

  const closeDrawer = (drawer: keyof typeof drawers) => {
    setDrawers((prev) => ({ ...prev, [drawer]: false }))
  }

  const handleApplicationSuccess = (type: "loan" | "savings" | "mortgage" | "commodity", applicationId?: string) => {
    setSuccessDetails({ type, applicationId })
    openDrawer("success")
    fetchApplications() // Refresh the list
  }

  const handleViewDetails = (application: Application) => {
    console.log("View details:", application)
  }

  // Filter applications by type for tabs
  const filterByType = (type: string) => {
    if (type === "all") return applications
    return applications.filter((app) => app.productType === type)
  }

  // Handle application type selection from drawer
  const handleSelectApplicationType = (type: "loan" | "savings" | "mortgage" | "commodity") => {
    switch (type) {
      case "loan":
        setSelectedProduct(MOCK_PRODUCTS.loans[0])
        openDrawer("loanApplication")
        break
      case "savings":
        setSelectedProduct(MOCK_PRODUCTS.savings[0])
        openDrawer("savingsApplication")
        break
      case "mortgage":
        setSelectedProduct(MOCK_PRODUCTS.mortgages[0])
        openDrawer("mortgageApplication")
        break
      case "commodity":
        setSelectedProduct(MOCK_PRODUCTS.commodities[0])
        openDrawer("commodityPurchase")
        break
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Applications</h1>
          <p className="text-muted-foreground">
            Track and manage your financial product applications
            {usingFallback && <span className="text-amber-600 ml-2">(API unavailable)</span>}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchApplications}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={() => openDrawer("newApplication")}
            className="bg-black hover:bg-black/90 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            New Application
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Applications</p>
          <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">
            {applications.filter((a) => a.status === "pending" || a.status === "under_review").length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Approved</p>
          <p className="text-2xl font-bold text-green-600">
            {applications.filter((a) => a.status === "approved").length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Rejected</p>
          <p className="text-2xl font-bold text-red-600">
            {applications.filter((a) => a.status === "rejected").length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-transparent p-0 h-auto border-b border-gray-200">
          <TabsTrigger
            value="all"
            className="px-0 py-3 mr-8 rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none"
          >
            All Applications
          </TabsTrigger>
          <TabsTrigger
            value="loan"
            className="px-0 py-3 mr-8 rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none"
          >
            Loans
          </TabsTrigger>
          <TabsTrigger
            value="savings"
            className="px-0 py-3 mr-8 rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none"
          >
            Savings
          </TabsTrigger>
          <TabsTrigger
            value="mortgage"
            className="px-0 py-3 mr-8 rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none"
          >
            Mortgages
          </TabsTrigger>
          <TabsTrigger
            value="commodity"
            className="px-0 py-3 mr-8 rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none"
          >
            Commodities
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <UserApplicationsTable
            applications={filterByType("all")}
            isLoading={isLoading}
            onViewDetails={handleViewDetails}
            onRefresh={fetchApplications}
          />
        </TabsContent>

        <TabsContent value="loan">
          <UserApplicationsTable
            applications={filterByType("loan")}
            isLoading={isLoading}
            onViewDetails={handleViewDetails}
            onRefresh={fetchApplications}
          />
        </TabsContent>

        <TabsContent value="savings">
          <UserApplicationsTable
            applications={filterByType("savings")}
            isLoading={isLoading}
            onViewDetails={handleViewDetails}
            onRefresh={fetchApplications}
          />
        </TabsContent>

        <TabsContent value="mortgage">
          <UserApplicationsTable
            applications={filterByType("mortgage")}
            isLoading={isLoading}
            onViewDetails={handleViewDetails}
            onRefresh={fetchApplications}
          />
        </TabsContent>

        <TabsContent value="commodity">
          <UserApplicationsTable
            applications={filterByType("commodity")}
            isLoading={isLoading}
            onViewDetails={handleViewDetails}
            onRefresh={fetchApplications}
          />
        </TabsContent>
      </Tabs>

      {/* Drawers */}
      {selectedProduct && (
        <>
          <LoanApplicationDrawer
            isOpen={drawers.loanApplication}
            onClose={() => closeDrawer("loanApplication")}
            product={{
              id: selectedProduct.id,
              name: selectedProduct.name,
              merchantId: "merchant-001",
              interestRate: selectedProduct.interestRate,
              minAmount: selectedProduct.minAmount,
              maxAmount: selectedProduct.maxAmount,
              currency: "USD",
            }}
            userId="user-001"
            onSuccess={(application) => {
              closeDrawer("loanApplication")
              handleApplicationSuccess("loan", application?.id || application?.reference)
            }}
          />

          <SavingsApplicationDrawer
            isOpen={drawers.savingsApplication}
            onClose={() => closeDrawer("savingsApplication")}
            product={{
              id: selectedProduct.id,
              name: selectedProduct.name,
              merchantId: "merchant-001",
              interestRate: selectedProduct.interestRate,
              minDeposit: selectedProduct.minDeposit || 100,
              currency: "USD",
            }}
            userId="user-001"
            onSuccess={(account) => {
              closeDrawer("savingsApplication")
              handleApplicationSuccess("savings", account?.id || account?.reference)
            }}
          />

          <MortgageApplicationDrawer
            isOpen={drawers.mortgageApplication}
            onClose={() => closeDrawer("mortgageApplication")}
            product={{
              id: selectedProduct.id,
              name: selectedProduct.name,
              merchantId: "merchant-001",
              interestRate: selectedProduct.interestRate,
              maxLTV: selectedProduct.maxLTV || 80,
              currency: "USD",
            }}
            userId="user-001"
            onSuccess={(application) => {
              closeDrawer("mortgageApplication")
              handleApplicationSuccess("mortgage", application?.id || application?.reference)
            }}
          />

          <CommodityPurchaseDrawer
            isOpen={drawers.commodityPurchase}
            onClose={() => closeDrawer("commodityPurchase")}
            product={{
              id: selectedProduct.id,
              name: selectedProduct.name,
              merchantId: "merchant-001",
              commodityType: selectedProduct.symbol || "XAU",
              unitPrice: selectedProduct.currentPrice || 2350,
              currency: "USD",
            }}
            userId="user-001"
            onSuccess={(purchase) => {
              closeDrawer("commodityPurchase")
              handleApplicationSuccess("commodity", purchase?.id || purchase?.reference)
            }}
          />
        </>
      )}

      {successDetails && (
        <ApplicationSuccessDrawer
          isOpen={drawers.success}
          onClose={() => {
            closeDrawer("success")
            setSuccessDetails(null)
          }}
          applicationType={successDetails.type}
          applicationId={successDetails.applicationId}
        />
      )}

      {/* New Application Type Selection Drawer */}
      <NewApplicationDrawer
        isOpen={drawers.newApplication}
        onClose={() => closeDrawer("newApplication")}
        onSelectType={handleSelectApplicationType}
      />
    </div>
  )
}
