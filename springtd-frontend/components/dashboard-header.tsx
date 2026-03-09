"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { HiMiniUser } from "react-icons/hi2"
import { FaBell } from "react-icons/fa"
import { ChevronLeft, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard/create-app": { title: "Welcome", subtitle: "Your application platform" },
  "/dashboard/create-app/all-apps": { title: "All Apps", subtitle: "Manage your applications" },
  "/dashboard/create-app/new-apps": { title: "Welcome", subtitle: "Your application platform" },
  "/dashboard/admin": { title: "Admin", subtitle: "Manage users and roles" },
  "/dashboard/billing": { title: "Billing", subtitle: "Track payments and invoices" },
  "/dashboard/compliance": { title: "Compliance", subtitle: "Control your integrations" },
  "/dashboard/developer": {
    title: "Developer",
    subtitle: "Manage your API credentials, products, and integration settings",
  },
  "/dashboard/settings": { title: "Settings", subtitle: "Adjust your preferences" },
}

import { productApi } from "@/lib/product-api"
import { useAuth } from "@/hooks/useAuth"

export const DashboardHeader: React.FC = () => {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [dynamicApps, setDynamicApps] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [currentProduct, setCurrentProduct] = useState<any>(null)

  // Load apps from user-specific localStorage key
  useEffect(() => {
    if (user?.id && typeof window !== 'undefined') {
      const storageKey = `springtd-apps-${user.id}`
      const savedApps = localStorage.getItem(storageKey)
      setDynamicApps(savedApps ? JSON.parse(savedApps) : [])
    }
  }, [user?.id])

  // Get current app ID and product details from URL
  const currentAppId = pathname?.split("/dashboard/create-app/all-apps/")[1]?.split("/")[0]
  const isProductDetailsPage = pathname?.match(/\/products\/([^/]+)\/([^/]+)$/)
  const productTypeFromDetails = isProductDetailsPage ? pathname.split("/products/")[1]?.split("/")[0] : null
  const productIdFromDetails = isProductDetailsPage ? pathname.split("/").pop() : null

  // Fetch products when on product details page
  useEffect(() => {
    const fetchProducts = async () => {
      if (currentAppId && isProductDetailsPage) {
        try {
          const data = await productApi.getProductsByAppId(currentAppId)

          if (data.success && data.data) {
            // Filter products by type
            const normalizedType = productTypeFromDetails?.charAt(0).toUpperCase() + productTypeFromDetails?.slice(1).toLowerCase()
            const filteredProducts = data.data.filter((p: any) => p.type === normalizedType)
            setProducts(filteredProducts)

            // Find current product
            const current = data.data.find((p: any) => p.id === productIdFromDetails)
            setCurrentProduct(current)
          }
        } catch (error) {
          console.error('Error fetching products:', error)
        }
      }
    }

    fetchProducts()
  }, [currentAppId, isProductDetailsPage, productTypeFromDetails, productIdFromDetails])

  const isAppDetailsPage = pathname?.includes("/dashboard/create-app/all-apps/") && pathname.split("/").length > 5

  const isProductListPage = pathname?.match(/\/products\/(mortgage|loan|savings|commodity)$/)
  const productTypeFromList = isProductListPage ? pathname.split("/").pop() : null

  const { title, subtitle } = routeTitles[pathname] || {
    title: "Dashboard",
    subtitle: "Welcome to your dashboard",
  }

  const handleBack = () => {
    if (isProductDetailsPage) {
      const pathParts = pathname?.split("/") || []
      const appIdIndex = pathParts.indexOf("all-apps") + 1
      const appId = pathParts[appIdIndex]
      const productTypeIndex = pathParts.indexOf("products") + 1
      const productType = pathParts[productTypeIndex]
      router.push(`/dashboard/create-app/all-apps/${appId}/products/${productType}`)
    } else if (isProductListPage) {
      const appId = pathname?.split("/dashboard/create-app/all-apps/")[1]?.split("/")[0]
      router.push(`/dashboard/create-app/all-apps/${appId}/products`)
    } else {
      router.push("/dashboard/create-app/all-apps")
    }
  }

  const currentApp = dynamicApps.find((app) => app.id === currentAppId) || dynamicApps[0] || { id: '', name: 'No App Selected' }

  const handleAppSwitch = (appId: string) => {
    const currentPath =
      pathname?.split("/dashboard/create-app/all-apps/")[1]?.split("/").slice(1).join("/") || "wallets/treasury"
    router.push(`/dashboard/create-app/all-apps/${appId}/${currentPath}`)
  }

  const handleProductSwitch = (newProductId: string) => {
    const appId = pathname?.split("/dashboard/create-app/all-apps/")[1]?.split("/")[0]
    router.push(`/dashboard/create-app/all-apps/${appId}/products/${productTypeFromDetails}/${newProductId}`)
  }

  return (
    <header className="bg-white">
      {/* Top mini-bar */}
      <div className="px-6 pt-3 flex items-center justify-between">
        {/* Left side - Back button and App dropdown */}
        {isAppDetailsPage ? (
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-8 w-8 rounded-full hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-[#8B7355] text-white hover:bg-[#7A6449] hover:text-white border-none gap-2 text-sm h-8"
                >
                  {currentApp?.name || 'No App Selected'}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {dynamicApps.length === 0 ? (
                  <DropdownMenuItem disabled>
                    No apps created yet
                  </DropdownMenuItem>
                ) : (
                  dynamicApps.map((app) => (
                    <DropdownMenuItem
                      key={app.id}
                      onClick={() => handleAppSwitch(app.id)}
                      className={currentApp?.id === app.id ? "bg-[#F0ECE2]" : ""}
                    >
                      {app.name}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div></div>
        )}

        {/* Right side - Notifications and Avatar */}
        <div className="flex items-center gap-6">
          <div className="h-6 w-px bg-gray-200" />

          {/* Notification */}
          <div className="relative">
            <FaBell className="h-6 w-6 text-gray-600" />
            <span className="absolute -top-1 -right-1 bg-[#8B7355] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium">
              4
            </span>
          </div>

          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-[#F0ECE2] flex items-center justify-center">
            <HiMiniUser className="h-4 w-4 text-[#8B7355]" />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-b border-[#E0D8C3] mt-4" />

      {/* Main header */}
      <div className="px-6 py-6 flex items-center justify-between">
        {isProductDetailsPage ? (
          <div className="flex items-center gap-4">
            {/* Product-specific dropdown and breadcrumb */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-[#8B7355] text-white hover:bg-[#7A6449] hover:text-white border-none gap-2"
                >
                  {currentProduct?.name || "Loading..."}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {products.length === 0 ? (
                  <DropdownMenuItem disabled>
                    No products available
                  </DropdownMenuItem>
                ) : (
                  products.map((product) => (
                    <DropdownMenuItem
                      key={product.id}
                      onClick={() => handleProductSwitch(product.id)}
                      className={product.id === productIdFromDetails ? "bg-[#F0ECE2]" : ""}
                    >
                      {product.name}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span
                className="cursor-pointer hover:text-gray-900"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  router.push(`/dashboard/create-app/all-apps/${currentAppId}/products/overview`)
                }}
              >
                Overview
              </span>
              <span>/</span>
              <span
                className="cursor-pointer hover:text-gray-900"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  router.push(`/dashboard/create-app/all-apps/${currentAppId}/products/${productTypeFromDetails}`)
                }}
              >
                {productTypeFromDetails?.charAt(0).toUpperCase() + productTypeFromDetails?.slice(1)} Products
              </span>
              <span>/</span>
              <span className="text-gray-900 font-medium">{currentProduct?.name || "Loading..."}</span>
            </div>
          </div>
        ) : isProductListPage ? (
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-10 w-10 rounded-full hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">
              {productTypeFromList?.charAt(0).toUpperCase() + productTypeFromList?.slice(1)} Products
            </h1>
          </div>
        ) : isAppDetailsPage ? (
          <div></div>
        ) : (
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          </div>
        )}
      </div>
    </header>
  )
}
