"use client"

import { useState } from "react"
import { Search, Filter } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConfigurePricingSheet } from "@/components/configure-pricing-sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const tabs = [
  { label: "Mortgage", value: "mortgage" },
  { label: "Loan", value: "loan" },
  { label: "Savings", value: "savings" },
  { label: "Investment", value: "investment" },
  { label: "Commodity", value: "commodity" },
]

const products = [
  {
    name: "Mortgage Product 1",
    id: "SPI-234-BY45K",
    type: "Mortgage",
    timestamp: "12:45 / Apr 12, 2025",
    metaRef: "X20445-78P",
  },
  {
    name: "Mortgage Product 2",
    id: "SPI-234-BY45K",
    type: "Mortgage",
    timestamp: "12:45 / Apr 12, 2025",
    metaRef: "X20445-78P",
  },
  {
    name: "Loan Product 1",
    id: "LOAN-111-AA22",
    type: "Loan",
    timestamp: "10:30 / May 01, 2025",
    metaRef: "L55443-12Q",
  },
  {
    name: "Loan Product 2",
    id: "LOAN-222-BB33",
    type: "Loan",
    timestamp: "14:15 / May 05, 2025",
    metaRef: "L88990-34W",
  },
  {
    name: "Savings Goal",
    id: "SAV-001-CC44",
    type: "Savings",
    timestamp: "09:00 / Jun 10, 2025",
    metaRef: "S11223-56E",
  },
  {
    name: "Investment Plan",
    id: "INV-999-DD55",
    type: "Investment",
    timestamp: "16:45 / Jul 22, 2025",
    metaRef: "I44556-78R",
  },
  {
    name: "Commodity Gold",
    id: "COM-777-EE66",
    type: "Commodity",
    timestamp: "11:20 / Aug 15, 2025",
    metaRef: "C99887-90T",
  },
]

export function ActiveProductsTable() {
  const router = useRouter()
  const [isConfigureOpen, setIsConfigureOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("mortgage")

  const filteredProducts = products.filter(
    (product) => product.type.toLowerCase() === activeTab
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full overflow-x-auto">
          <TabsList className="bg-transparent h-auto p-0 space-x-8 border-b border-gray-200 w-full justify-start rounded-none">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="bg-transparent shadow-none border-b-2 border-transparent data-[state=active]:border-b-[#7C3AED] !border-t-0 !border-x-0 rounded-none px-1 pb-4 text-sm font-medium text-gray-500 data-[state=active]:text-[#7C3AED] hover:text-gray-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        
        <div className="flex items-center gap-4 min-w-[300px]">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
             <Input placeholder="Search" className="pl-9 h-10" />
           </div>
           <Button variant="outline" className="gap-2 h-10 font-normal">
             <Filter className="w-4 h-4" />
             Sort
           </Button>
        </div>
      </div>

      <div className="bg-gray-50/50 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-100/50 hover:bg-gray-100/50">
            <TableRow className="border-b-0 hover:bg-transparent">
              <TableHead className="font-medium text-gray-500">Name of Product</TableHead>
              <TableHead className="font-medium text-gray-500">Product ID</TableHead>
              <TableHead className="font-medium text-gray-500">Product type</TableHead>
              <TableHead className="font-medium text-gray-500">Timestamp</TableHead>
              <TableHead className="font-medium text-gray-500">Meta_Ref</TableHead>
              <TableHead className="font-medium text-gray-500">Configuration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product, index) => (
              <TableRow 
                key={index} 
                className="hover:bg-gray-50 border-b border-gray-100 cursor-pointer"
                onClick={() => router.push("/dashboard/merchant/products/active/active-loan")}
              >
                <TableCell className="font-medium py-6 bg-white">{product.name}</TableCell>
                <TableCell className="bg-white">
                  <div className="flex items-center gap-2">
                    {product.id}
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </button>
                  </div>
                </TableCell>
                <TableCell className="bg-white">{product.type}</TableCell>
                <TableCell className="text-gray-500 bg-white">{product.timestamp}</TableCell>
                <TableCell className="bg-white">
                   <div className="flex items-center gap-2">
                    {product.metaRef}
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </button>
                  </div>
                </TableCell>
                <TableCell className="bg-white">
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsConfigureOpen(true)
                    }}
                    className="bg-[#dcdcdc] hover:bg-[#d1d1d1] text-gray-700 rounded-full h-8 px-6 text-xs font-semibold shadow-none w-[100px]"
                  >
                    Configure
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfigurePricingSheet open={isConfigureOpen} onOpenChange={setIsConfigureOpen} />
    </div>
  )
}
