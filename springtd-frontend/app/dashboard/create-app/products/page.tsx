"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Bell, User, Plus } from "lucide-react"
import { IoIosCopy } from "react-icons/io"
import { productApi } from "@/lib/product-api"
import CreateProductDrawer from "@/components/drawers/create-product-drawer"
import CreateLoanDrawer from "@/components/drawers/create-loan-drawer"
import CreateMortgageDrawer from "@/components/drawers/create-mortgage-drawer"
import CreateSavingsDrawer from "@/components/drawers/create-savings-drawer"
import CreateCommodityDrawer from "@/components/drawers/create-commodity-drawer"
import ConfigureLoanDrawer from "@/components/drawers/configure-loan-drawer"
import ConfigureMortgageDrawer from "@/components/drawers/configure-mortgage-drawer"
import ConfigureSavingsDrawer from "@/components/drawers/configure-savings-drawer"
import ConfigureCommodityDrawer from "@/components/drawers/configure-commodity-drawer"
import ProcessingDrawer from "@/components/drawers/processing-drawer"
import LoanCreatedSuccessDrawer from "@/components/drawers/loan-created-success-drawer"
import MortgageCreatedSuccessDrawer from "@/components/drawers/mortgage-created-success-drawer"
import SavingsCreatedSuccessDrawer from "@/components/drawers/savings-created-success-drawer"
import CommodityCreatedSuccessDrawer from "@/components/drawers/commodity-created-success-drawer"
import Link from "next/link"

type Product = {
  id: string
  amount: string
  ref: string
  timestamp: string
  fee: string
  product: string
  metaRef: string
  allUsers: string
  userPhone: string
}

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState("products")
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false)
  
  // Loan states
  const [isCreateLoanOpen, setIsCreateLoanOpen] = useState(false)
  const [isConfigureLoanOpen, setIsConfigureLoanOpen] = useState(false)
  const [isLoanSuccessOpen, setIsLoanSuccessOpen] = useState(false)
  const [loanData, setLoanData] = useState<any>(null)
  
  // Mortgage states
  const [isCreateMortgageOpen, setIsCreateMortgageOpen] = useState(false)
  const [isConfigureMortgageOpen, setIsConfigureMortgageOpen] = useState(false)
  const [isMortgageSuccessOpen, setIsMortgageSuccessOpen] = useState(false)
  const [mortgageData, setMortgageData] = useState<any>(null)
  
  // Savings states
  const [isCreateSavingsOpen, setIsCreateSavingsOpen] = useState(false)
  const [isConfigureSavingsOpen, setIsConfigureSavingsOpen] = useState(false)
  const [isSavingsSuccessOpen, setIsSavingsSuccessOpen] = useState(false)
  const [savingsData, setSavingsData] = useState<any>(null)
  
  // Commodity states
  const [isCreateCommodityOpen, setIsCreateCommodityOpen] = useState(false)
  const [isConfigureCommodityOpen, setIsConfigureCommodityOpen] = useState(false)
  const [isCommoditySuccessOpen, setIsCommoditySuccessOpen] = useState(false)
  const [commodityData, setCommodityData] = useState<any>(null)
  
  // Processing state
  const [isProcessingOpen, setIsProcessingOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [currentProductType, setCurrentProductType] = useState<string>("")

  const [products, setProducts] = useState<Product[]>([
    {
      id: "1",
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:45 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      allUsers: "grace.yo@spring.td",
      userPhone: "+234703671453B",
    },
    {
      id: "2",
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:45 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      allUsers: "grace.yo@spring.td",
      userPhone: "+234703671453B",
    },
    {
      id: "3",
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:45 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      allUsers: "grace.yo@spring.td",
      userPhone: "+234703671453B",
    },
    {
      id: "4",
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:45 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      allUsers: "grace.yo@spring.td",
      userPhone: "+234703671453B",
    },
  ])

  const handleProductSelect = (productType: string) => {
    setCurrentProductType(productType)
    setIsCreateProductOpen(false)
    if (productType === "loan") {
      setIsCreateLoanOpen(true)
    } else if (productType === "mortgage") {
      setIsCreateMortgageOpen(true)
    } else if (productType === "savings") {
      setIsCreateSavingsOpen(true)
    } else if (productType === "commodity") {
      setIsCreateCommodityOpen(true)
    }
  }

  // Back handlers to return to product selection
  const handleBackToProductSelection = () => {
    // Close all product creation drawers
    setIsCreateLoanOpen(false)
    setIsCreateMortgageOpen(false)
    setIsCreateSavingsOpen(false)
    setIsCreateCommodityOpen(false)
    // Reopen product selection
    setIsCreateProductOpen(true)
  }

  // Loan handlers
  const handleCreateLoan = async (data: any) => {
    setLoanData(data)
    setIsCreateLoanOpen(false)
    setIsProcessingOpen(true)

    try {
      // Create product with incomplete status
      const result = await productApi.createProduct({
        name: data?.productName || "Loan Product",
        description: data?.description || "Loan product",
        type: "Loan",
        appId: data?.appId || "default-app",
        status: 'incomplete'
      })

      if (result.success && result.data) {
        setLoanData({ ...data, productId: result.data.id })
        setIsProcessingOpen(false)
        setIsConfigureLoanOpen(true)
      } else {
        throw new Error(result.error || 'Failed to create product')
      }
    } catch (error) {
      console.error('Error creating loan product:', error)
      setIsProcessingOpen(false)
      alert('Failed to create loan product. Please try again.')
    }
  }

  const handleConfigureLoan = async (configData: any) => {
    setIsConfigureLoanOpen(false)
    setIsProcessingOpen(true)

    try {
      const productId = loanData?.productId
      if (productId) {
        // Save configuration and update status to complete
        await productApi.saveProductConfiguration(productId, 'Loan', configData)
        await productApi.updateProduct(productId, { status: 'complete' })
      }

      setTimeout(() => {
        setIsProcessingOpen(false)
        setIsLoanSuccessOpen(true)
      }, 1000)
    } catch (error) {
      console.error('Error configuring loan product:', error)
      setIsProcessingOpen(false)
      alert('Failed to configure loan product. Please try again.')
    }
  }

  // Mortgage handlers
  const handleCreateMortgage = async (data: any) => {
    setMortgageData(data)
    setIsCreateMortgageOpen(false)
    setIsProcessingOpen(true)

    try {
      // Create product with incomplete status
      const result = await productApi.createProduct({
        name: data?.productName || "Mortgage Product",
        description: data?.description || "Mortgage product",
        type: "Mortgage",
        appId: data?.appId || "default-app",
        status: 'incomplete'
      })

      if (result.success && result.data) {
        setMortgageData({ ...data, productId: result.data.id })
        setIsProcessingOpen(false)
        setIsConfigureMortgageOpen(true)
      } else {
        throw new Error(result.error || 'Failed to create product')
      }
    } catch (error) {
      console.error('Error creating mortgage product:', error)
      setIsProcessingOpen(false)
      alert('Failed to create mortgage product. Please try again.')
    }
  }

  const handleConfigureMortgage = async (configData: any) => {
    setIsConfigureMortgageOpen(false)
    setIsProcessingOpen(true)

    try {
      const productId = mortgageData?.productId
      if (productId) {
        // Save configuration and update status to complete
        await productApi.saveProductConfiguration(productId, 'Mortgage', configData)
        await productApi.updateProduct(productId, { status: 'complete' })
      }

      setTimeout(() => {
        setIsProcessingOpen(false)
        setIsMortgageSuccessOpen(true)
      }, 1000)
    } catch (error) {
      console.error('Error configuring mortgage product:', error)
      setIsProcessingOpen(false)
      alert('Failed to configure mortgage product. Please try again.')
    }
  }

  // Savings handlers
  const handleCreateSavings = (data: any) => {
    setSavingsData(data)
    setIsCreateSavingsOpen(false)
    setIsConfigureSavingsOpen(true)
  }

  const handleConfigureSavings = (configData: any) => {
    setIsConfigureSavingsOpen(false)
    setIsProcessingOpen(true)

    // Simulate processing
    setTimeout(() => {
      setIsProcessingOpen(false)
      setIsSavingsSuccessOpen(true)
    }, 2000)
  }

  // Commodity handlers
  const handleCreateCommodity = (data: any) => {
    setCommodityData(data)
    setIsCreateCommodityOpen(false)
    setIsConfigureCommodityOpen(true)
  }

  const handleConfigureCommodity = (configData: any) => {
    setIsConfigureCommodityOpen(false)
    setIsProcessingOpen(true)

    // Simulate processing
    setTimeout(() => {
      setIsProcessingOpen(false)
      setIsCommoditySuccessOpen(true)
    }, 2000)
  }

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
  }

  const handleCopyRef = (ref: string) => {
    navigator.clipboard.writeText(ref)
  }

  return (
    <div className="flex-1 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-end gap-4">
          <button className="relative p-2 hover:bg-gray-100 rounded-full">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#9A813F] rounded-full"></span>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <User size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 px-8">
        <div className="flex gap-8">
          <Link
            href="/dashboard/create-app/wallet"
            className={`py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "wallet"
                ? "border-[#9A813F] text-[#9A813F]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Wallet
          </Link>
          <button
            onClick={() => setActiveTab("products")}
            className={`py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "products"
                ? "border-[#9A813F] text-[#9A813F]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Products
          </button>
          <Link
            href="/dashboard/create-app/transactions"
            className={`py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "transactions"
                ? "border-[#9A813F] text-[#9A813F]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Transactions
          </Link>
          <Link
            href="/dashboard/create-app/drive"
            className={`py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "drive"
                ? "border-[#9A813F] text-[#9A813F]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Drive
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">All Product</h2>
          <Button onClick={() => setIsCreateProductOpen(true)} className="bg-black text-white hover:bg-gray-800 gap-2">
            <Plus size={16} />
            create product
          </Button>
        </div>

        {/* Products Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F5F5F5]">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Amount</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Ref</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Timestamp</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Fee</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Product</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Meta_Ref</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">All users</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">User Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleProductClick(product)}
                >
                  <td className="px-6 py-4 text-sm text-gray-900">{product.amount}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>{product.ref}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyRef(product.ref)
                        }}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy reference"
                      >
                        <IoIosCopy size={16} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.timestamp}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.fee}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{product.product}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>{product.metaRef}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyRef(product.metaRef)
                        }}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy reference"
                      >
                        <IoIosCopy size={16} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.allUsers}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.userPhone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawers */}
      <CreateProductDrawer
        isOpen={isCreateProductOpen}
        onClose={() => setIsCreateProductOpen(false)}
        onSelectProduct={handleProductSelect}
      />
      <CreateLoanDrawer
        isOpen={isCreateLoanOpen}
        onClose={() => setIsCreateLoanOpen(false)}
        onSubmit={handleCreateLoan}
        onBack={handleBackToProductSelection}
      />
      <CreateMortgageDrawer
        isOpen={isCreateMortgageOpen}
        onClose={() => setIsCreateMortgageOpen(false)}
        onSubmit={handleCreateMortgage}
        onBack={handleBackToProductSelection}
      />
      <CreateSavingsDrawer
        isOpen={isCreateSavingsOpen}
        onClose={() => setIsCreateSavingsOpen(false)}
        onSubmit={handleCreateSavings}
        onBack={handleBackToProductSelection}
      />
      <CreateCommodityDrawer
        isOpen={isCreateCommodityOpen}
        onClose={() => setIsCreateCommodityOpen(false)}
        onSubmit={handleCreateCommodity}
        onBack={handleBackToProductSelection}
      />
      
      {/* Configuration Drawers */}
      <ConfigureLoanDrawer
        isOpen={isConfigureLoanOpen}
        onClose={() => {
          setIsConfigureLoanOpen(false)
          setSelectedProduct(null)
        }}
        onSubmit={handleConfigureLoan}
        loanData={loanData}
      />
      <ConfigureMortgageDrawer
        isOpen={isConfigureMortgageOpen}
        onClose={() => setIsConfigureMortgageOpen(false)}
        onSubmit={handleConfigureMortgage}
        mortgageData={mortgageData}
      />
      <ConfigureSavingsDrawer
        isOpen={isConfigureSavingsOpen}
        onClose={() => setIsConfigureSavingsOpen(false)}
        onSubmit={handleConfigureSavings}
        savingsData={savingsData}
      />
      <ConfigureCommodityDrawer
        isOpen={isConfigureCommodityOpen}
        onClose={() => setIsConfigureCommodityOpen(false)}
        onSubmit={handleConfigureCommodity}
        commodityData={commodityData}
      />
      
      {/* Processing Drawer */}
      <ProcessingDrawer isOpen={isProcessingOpen} />
      
      {/* Success Drawers */}
      <LoanCreatedSuccessDrawer
        isOpen={isLoanSuccessOpen}
        onClose={() => {
          setIsLoanSuccessOpen(false)
          setLoanData(null)
          setCurrentProductType("")
        }}
      />
      <MortgageCreatedSuccessDrawer
        isOpen={isMortgageSuccessOpen}
        onClose={() => {
          setIsMortgageSuccessOpen(false)
          setMortgageData(null)
          setCurrentProductType("")
        }}
      />
      <SavingsCreatedSuccessDrawer
        isOpen={isSavingsSuccessOpen}
        onClose={() => {
          setIsSavingsSuccessOpen(false)
          setSavingsData(null)
          setCurrentProductType("")
        }}
      />
      <CommodityCreatedSuccessDrawer
        isOpen={isCommoditySuccessOpen}
        onClose={() => {
          setIsCommoditySuccessOpen(false)
          setCommodityData(null)
          setCurrentProductType("")
        }}
      />
    </div>
  )
}
