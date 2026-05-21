'use client'

import { ProductApplicationFlow } from '@/components/mobile-v2/application/ProductApplicationFlow'

export function MortgageApplyFlow({ productId: _productId }: { productId: string }) {
  return <ProductApplicationFlow kind="mortgage" />
}
