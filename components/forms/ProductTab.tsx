"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Eye } from "lucide-react"

export function ProductTab() {
  const [showProducts, setShowProducts] = useState(false)

  const products = [
    {
      id: "1",
      name: "Product Name",
      productId: "MEHL0LSKBL5FS",
      dateCreated: "12/09/2025",
      metaRef: "X20445-78P",
      status: "Successful",
    },
    {
      id: "2",
      name: "Product Name",
      productId: "MEHL0LSKBL5FS",
      dateCreated: "12/09/2025",
      metaRef: "X20445-78P",
      status: "Failed",
    },
    {
      id: "3",
      name: "Product Name",
      productId: "MEHL0LSKBL5FS",
      dateCreated: "12/09/2025",
      metaRef: "X20445-78P",
      status: "Successful",
    },
    {
      id: "4",
      name: "Product Name",
      productId: "MEHL0LSKBL5FS",
      dateCreated: "12/09/2025",
      metaRef: "X20445-78P",
      status: "Pending",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Successful":
        return "bg-green-100 text-green-800"
      case "Failed":
        return "bg-red-100 text-red-800"
      case "Pending":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div></div>
        <Button className="bg-black text-white hover:bg-gray-800" onClick={() => setShowProducts(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Product
        </Button>
      </div>

      {!showProducts ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-16 text-center">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Created</h3>
          <p className="text-gray-500 mb-6">Create your first product to get started with the API.</p>
          <Button className="bg-black text-white hover:bg-gray-800" onClick={() => setShowProducts(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Product
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
            <div>Product Name</div>
            <div>Product ID</div>
            <div>Date Created</div>
            <div>Meta_Ref</div>
            <div>Product Status</div>
            <div>Download</div>
          </div>
          {products.map((product) => (
            <div
              key={product.id}
              className="grid grid-cols-6 gap-4 p-4 border-b border-gray-100 last:border-b-0 text-sm"
            >
              <div className="font-medium">{product.name}</div>
              <div className="flex items-center gap-2">
                <span>{product.productId}</span>
                <Eye className="w-4 h-4 text-gray-400" />
                <button className="w-2 h-2 bg-gray-400 rounded-full"></button>
              </div>
              <div>{product.dateCreated}</div>
              <div className="flex items-center gap-2">
                <span>{product.metaRef}</span>
                <button className="w-2 h-2 bg-gray-400 rounded-full"></button>
              </div>
              <div>
                <Badge className={getStatusColor(product.status)}>{product.status}</Badge>
              </div>
              <div>
                <Button variant="outline" size="sm">
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
