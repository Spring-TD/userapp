"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { IoIosCopy } from "react-icons/io"
import { Button } from "@/components/ui/button"
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

export function ProductsTab() {
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
  const [selectedProduct, setSelectedProduct] = useState<any>(null)

  const [products, setProducts] = useState([
    {
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleProductSelect = (productType: string) => {
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

  const handleProductClick = (product: any) => {
    setSelectedProduct(product)
  }

  return (
    <>
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
            {products.map((product, index) => (
              <tr key={index} onClick={() => handleProductClick(product)} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-6 py-4 text-sm text-gray-900">{product.amount}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    {product.ref}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopy(product.ref)
                      }}
                      className="hover:text-[#9A813F]"
                    >
                      <IoIosCopy size={16} />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{product.timestamp}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{product.fee}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{product.product}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    {product.metaRef}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopy(product.metaRef)
                      }}
                      className="hover:text-[#9A813F]"
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
        onClose={() => setIsConfigureLoanOpen(false)}
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
      <LoanCreatedSuccessDrawer isOpen={isLoanSuccessOpen} onClose={() => setIsLoanSuccessOpen(false)} />
      <MortgageCreatedSuccessDrawer isOpen={isMortgageSuccessOpen} onClose={() => setIsMortgageSuccessOpen(false)} />
      <SavingsCreatedSuccessDrawer isOpen={isSavingsSuccessOpen} onClose={() => setIsSavingsSuccessOpen(false)} />
      <CommodityCreatedSuccessDrawer isOpen={isCommoditySuccessOpen} onClose={() => setIsCommoditySuccessOpen(false)} />
    </>
  )
}
