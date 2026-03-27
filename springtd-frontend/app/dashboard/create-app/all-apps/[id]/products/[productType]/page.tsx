"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { productApi } from "@/lib/product-api"

export default function ProductTypeListPage() {
  const params = useParams()
  const router = useRouter()
  const productType = params.productType as string
  const appId = params.id as string
  const [products, setProducts] = useState<any[]>([])
  const [activations, setActivations] = useState<{ [key: string]: boolean }>({})
  const [loading, setLoading] = useState(true)

  // Load ALL products from Product Builder and app-specific activations
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch all products from Product Builder
        const productsData = await productApi.getAllProductsFromBuilder()

        // Fetch app-specific product activations
        const activationsData = await productApi.getAppProductActivations(appId)

        if (productsData.success && productsData.data) {
          // Normalize productType to match stored type (capitalize first letter)
          const normalizedType = productType.charAt(0).toUpperCase() + productType.slice(1).toLowerCase()
          const filteredProducts = productsData.data.filter((product: any) => product.type === normalizedType)
          setProducts(filteredProducts)
        }

        if (activationsData.success && activationsData.data) {
          // Create a map of productId -> isActive
          const activationMap: { [key: string]: boolean } = {}
          activationsData.data.forEach((activation: any) => {
            activationMap[activation.productId] = activation.isActive
          })
          setActivations(activationMap)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (appId && productType) {
      fetchData()
    }
  }, [appId, productType])

  // Get product type display name
  const getProductTypeDisplayName = () => {
    return productType.charAt(0).toUpperCase() + productType.slice(1)
  }

  const handleToggleActivation = async (productId: string, currentState: boolean) => {
    try {
      const newState = !currentState
      await productApi.toggleAppProductActivation(appId, productId, newState)

      // Update local state
      setActivations(prev => ({
        ...prev,
        [productId]: newState
      }))
    } catch (error) {
      console.error('Error toggling product activation:', error)
      alert('Failed to toggle product activation. Please try again.')
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => router.push(`/dashboard/create-app/all-apps/${appId}/products/overview`)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-medium">All {getProductTypeDisplayName()} Products</h2>
          </div>
          <p className="text-sm text-gray-600 ml-7">
            {products.length} product(s) available from Product Builder
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-600">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No {getProductTypeDisplayName()} Products Available</h3>
          <p className="text-gray-600">
            No {productType} products have been created in Product Builder yet.
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F5F5F5]">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Product Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Description</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Date Created</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Activate for App</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => {
                const isActive = activations[product.id] || false
                return (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {product.name || product.productName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {product.description || 'No description'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(product.createdAt || product.dateCreated)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActivation(product.id, isActive)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? "bg-[#9A813F]" : "bg-gray-200"
                          }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? "translate-x-6" : "translate-x-1"
                            }`}
                        />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
