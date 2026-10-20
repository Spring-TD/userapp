"use client"

import { Drawer } from "@/components/drawer"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/useAuth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getUserFromToken } from "@/lib/tokenManager"

interface ProductDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: any
}

export function ProductDetailModal({ open, onOpenChange, product }: ProductDetailModalProps) {
  const { user } = useAuth()
  const tokenUser = typeof window !== "undefined" ? getUserFromToken() : null
  const effectiveUser = user ?? tokenUser

  const displayName = effectiveUser
    ? [effectiveUser.firstName, effectiveUser.lastName].filter(Boolean).join(" ").trim()
    : ""
  const displayEmail = effectiveUser?.email ?? ""
  const initialsFromName = effectiveUser
    ? `${(effectiveUser.firstName ?? "").trim().charAt(0)}${(effectiveUser.lastName ?? "").trim().charAt(0)}`.toUpperCase()
    : ""
  const initials = initialsFromName || (displayEmail?.charAt(0) ?? "U").toUpperCase()

  if (!product) return null

  return (
    <Drawer 
      open={open} 
      onOpenChange={onOpenChange}
      title={product.title || "Product Details"}
      className="w-[45%] min-w-[400px]"
    >
        <div className="space-y-6">
           <div className="space-y-1">
              <p className="text-xs text-gray-400">Product Details</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                 {product.description || "Lorem ipsum dolor sit amet consectetur. Feugiat enim ultrices consectetur sagittis faucibus vitae mi nunc vehicula."}
              </p>
           </div>
           
           <div className="h-px bg-purple-100" />
           
           <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <span className="text-xs text-gray-400">Status</span>
                 <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-3 py-1 text-xs">{product.status || "Active"}</Badge>
                 {/* Fixed "Activity" to "Active" as per previous constraint */}
              </div>

              <div className="flex justify-between items-center h-px bg-purple-50" />

              <div className="flex justify-between items-center">
                 <span className="text-xs text-gray-400">Duration</span>
                 <span className="text-sm font-semibold text-gray-900">{product.duration || "3 Months"}</span>
              </div>
              
              <div className="flex justify-between items-center h-px bg-purple-50" />

              <div className="flex justify-between items-center">
                 <span className="text-xs text-gray-400">Interest rate</span>
                 <span className="text-sm font-semibold text-gray-900">{product.interestRate || "15%"}</span>
              </div>

              <div className="flex justify-between items-center h-px bg-purple-50" />

              <div className="flex justify-between items-center">
                 <span className="text-xs text-gray-400">Date Created</span>
                 <span className="text-sm font-semibold text-gray-900">Dec 12, 2025</span>
              </div>

              <div className="flex justify-between items-center h-px bg-purple-50" />

              <div className="flex justify-between items-center">
                 <span className="text-xs text-gray-400">Product type</span>
                 <span className="text-sm font-semibold text-gray-900">{product.category || "Mortgage"}</span>
              </div>

               <div className="flex justify-between items-center h-px bg-purple-50" />

               <div className="flex justify-between items-center">
                 <span className="text-xs text-gray-400">Mortgage Name</span>
                 <span className="text-sm font-semibold text-gray-900">{product.category || "Mortgage"}</span>
              </div>

               <div className="flex justify-between items-center h-px bg-purple-50" />

               <div className="flex justify-between items-center">
                 <span className="text-xs text-gray-400">Property Value</span>
                 <span className="text-sm font-semibold text-gray-900">{product.category || "Mortgage"}</span>
              </div>

              <div className="flex justify-between items-center h-px bg-purple-50" />

              <div className="flex justify-between items-center">
                 <span className="text-xs text-gray-400">Initiated by</span>
                 <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-[10px] font-semibold text-gray-900 bg-muted">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-xs font-semibold text-gray-900">{displayName}</p>
                        <p className="text-[10px] text-gray-500">{displayEmail}</p>
                    </div>
                 </div>
              </div>
               <div className="flex justify-between items-center h-px bg-purple-50" />
           </div>
        </div>
    </Drawer>
  )
}
