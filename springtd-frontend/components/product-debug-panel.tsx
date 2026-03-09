"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { productApi } from "@/lib/product-api"

interface DebugInfo {
    currentAppId?: string
    productsForCurrentApp: number
    totalProducts: number
    allAppIds: string[]
    sampleProducts: any[]
    apiStatus: 'checking' | 'success' | 'error'
    apiError?: string
    timestamp: string
}

interface ProductDebugPanelProps {
    appId?: string
    location: 'platter' | 'spring'
}

export function ProductDebugPanel({ appId, location }: ProductDebugPanelProps) {
    const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
    const [loading, setLoading] = useState(false)
    const [expanded, setExpanded] = useState(false)

    const fetchDebugInfo = async () => {
        setLoading(true)
        try {
            // Fetch all products
            const allProductsResponse = await productApi.getAllProducts()

            const allProducts = allProductsResponse.success ? allProductsResponse.data : []
            const productsForApp = appId
                ? allProducts.filter((p: any) => p.appId === appId)
                : []

            // Get unique appIds
            const uniqueAppIds = [...new Set(allProducts.map((p: any) => p.appId))]

            // Get sample products (first 5)
            const sampleProducts = allProducts.slice(0, 5).map((p: any) => ({
                id: p.id,
                name: p.name,
                type: p.type,
                appId: p.appId,
                isActive: p.isActive,
                status: p.status
            }))

            setDebugInfo({
                currentAppId: appId,
                productsForCurrentApp: productsForApp.length,
                totalProducts: allProducts.length,
                allAppIds: uniqueAppIds,
                sampleProducts,
                apiStatus: 'success',
                timestamp: new Date().toISOString()
            })
        } catch (error: any) {
            setDebugInfo({
                currentAppId: appId,
                productsForCurrentApp: 0,
                totalProducts: 0,
                allAppIds: [],
                sampleProducts: [],
                apiStatus: 'error',
                apiError: error.message || 'Failed to fetch debug info',
                timestamp: new Date().toISOString()
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (expanded) {
            fetchDebugInfo()
        }
    }, [expanded, appId])

    if (!expanded) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <Button
                    onClick={() => setExpanded(true)}
                    variant="outline"
                    className="bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Debug Products
                </Button>
            </div>
        )
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 w-[500px]">
            <Card className="shadow-lg border-2 border-yellow-300">
                <CardHeader className="bg-yellow-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                                Product Debug Panel
                            </CardTitle>
                            <CardDescription>
                                Location: <Badge variant="outline">{location === 'platter' ? 'Product Builder' : 'Spring App'}</Badge>
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={fetchDebugInfo}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4" />
                                )}
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setExpanded(false)}
                            >
                                ✕
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-4 max-h-[600px] overflow-y-auto">
                    {loading && !debugInfo ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : debugInfo ? (
                        <div className="space-y-4">
                            {/* API Status */}
                            <div className="flex items-center gap-2">
                                {debugInfo.apiStatus === 'success' ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-red-500" />
                                )}
                                <span className="font-medium">
                                    API Status: {debugInfo.apiStatus === 'success' ? 'Connected' : 'Error'}
                                </span>
                            </div>

                            {debugInfo.apiError && (
                                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                                    <strong>Error:</strong> {debugInfo.apiError}
                                </div>
                            )}

                            {/* Current AppId */}
                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                <div className="text-sm font-medium text-blue-900 mb-1">Current AppId</div>
                                <div className="font-mono text-xs text-blue-700 break-all">
                                    {debugInfo.currentAppId || 'Not set'}
                                </div>
                            </div>

                            {/* Product Counts */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                                    <div className="text-xs text-gray-600 mb-1">Products for This App</div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {debugInfo.productsForCurrentApp}
                                    </div>
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                                    <div className="text-xs text-gray-600 mb-1">Total Products</div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {debugInfo.totalProducts}
                                    </div>
                                </div>
                            </div>

                            {/* All AppIds */}
                            <div>
                                <div className="text-sm font-medium text-gray-900 mb-2">
                                    All AppIds in System ({debugInfo.allAppIds.length})
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-32 overflow-y-auto">
                                    {debugInfo.allAppIds.length > 0 ? (
                                        <div className="space-y-1">
                                            {debugInfo.allAppIds.map((id, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`font-mono text-xs p-1 rounded ${id === debugInfo.currentAppId
                                                            ? 'bg-green-100 text-green-800 font-bold'
                                                            : 'text-gray-600'
                                                        }`}
                                                >
                                                    {id === debugInfo.currentAppId && '→ '}
                                                    {id}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-500 italic">No products found</div>
                                    )}
                                </div>
                            </div>

                            {/* Sample Products */}
                            <div>
                                <div className="text-sm font-medium text-gray-900 mb-2">
                                    Sample Products (First 5)
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-48 overflow-y-auto">
                                    {debugInfo.sampleProducts.length > 0 ? (
                                        <div className="space-y-2">
                                            {debugInfo.sampleProducts.map((product, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`text-xs p-2 rounded border ${product.appId === debugInfo.currentAppId
                                                            ? 'bg-green-50 border-green-200'
                                                            : 'bg-white border-gray-200'
                                                        }`}
                                                >
                                                    <div className="font-medium text-gray-900">{product.name}</div>
                                                    <div className="text-gray-600 mt-1">
                                                        Type: {product.type} | Status: {product.status}
                                                    </div>
                                                    <div className="font-mono text-gray-500 mt-1 break-all">
                                                        AppId: {product.appId}
                                                    </div>
                                                    <div className="flex gap-2 mt-1">
                                                        <Badge variant={product.isActive ? 'default' : 'secondary'} className="text-xs">
                                                            {product.isActive ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-xs">
                                                            {product.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-500 italic">No products found</div>
                                    )}
                                </div>
                            </div>

                            {/* Timestamp */}
                            <div className="text-xs text-gray-500 text-center pt-2 border-t">
                                Last updated: {new Date(debugInfo.timestamp).toLocaleTimeString()}
                            </div>

                            {/* Diagnostic Tips */}
                            {debugInfo.productsForCurrentApp === 0 && debugInfo.totalProducts > 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                                    <strong className="text-yellow-900">⚠️ AppId Mismatch Detected!</strong>
                                    <p className="text-yellow-800 mt-1">
                                        There are {debugInfo.totalProducts} products in the system, but none match the current appId.
                                        Check if the appId is correct.
                                    </p>
                                </div>
                            )}

                            {debugInfo.totalProducts === 0 && (
                                <div className="bg-orange-50 border border-orange-200 rounded p-3 text-sm">
                                    <strong className="text-orange-900">⚠️ No Products Found!</strong>
                                    <p className="text-orange-800 mt-1">
                                        No products exist in the system. Create products in the Product Builder.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    )
}
