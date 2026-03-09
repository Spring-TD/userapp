"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { springProductService } from "@/lib/springProductService"
import { debugJWT } from "@/lib/debugJWT"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function SpringProductTest() {
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Get merchant ID from token
    const id = springProductService.getMerchantId()
    setMerchantId(id)
  }, [])

  const handleDebugJWT = () => {
    debugJWT()
    toast.success("Check browser console for JWT details")
  }

  const handleFetchProducts = async () => {
    setLoading(true)
    try {
      console.log('Fetching products from:', process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL || 'https://product-ms.fly.dev')
      const response = await springProductService.getAllProducts()
      console.log('Response:', response)
      setProducts(response.data || [])
      toast.success(`Fetched ${response.data?.length || 0} products`)
    } catch (error: any) {
      console.error('Fetch error:', error)
      toast.error(error.message || "Failed to fetch products")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleProduct = async (productId: string, currentStatus: boolean) => {
    if (!merchantId) {
      toast.error("No merchant ID found in token")
      return
    }

    try {
      await springProductService.toggleProductActivation(merchantId, productId, !currentStatus)
      toast.success(`Product ${!currentStatus ? 'activated' : 'deactivated'}`)
      // Refresh products
      handleFetchProducts()
    } catch (error: any) {
      toast.error(error.message || "Failed to toggle product")
      console.error(error)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Spring Product Service Test</CardTitle>
          <CardDescription>Test integration with Product MS</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Merchant ID from token:</p>
            <p className="font-mono text-sm">{merchantId || "Not found"}</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleDebugJWT} variant="outline">
              Debug JWT (Check Console)
            </Button>
            <Button onClick={handleFetchProducts} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Fetch All Products
            </Button>
          </div>

          {products.length > 0 ? (
            <div className="space-y-2">
              <h3 className="font-semibold">Products ({products.length})</h3>
              <div className="space-y-2">
                {products.map((product) => (
                  <Card key={product.id}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={product.isActive ? "destructive" : "default"}
                        onClick={() => handleToggleProduct(product.id, product.isActive)}
                      >
                        {product.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : products.length === 0 && !loading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  ✅ Integration working! No products found in Product Builder.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create products in Product Builder to see them here.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
