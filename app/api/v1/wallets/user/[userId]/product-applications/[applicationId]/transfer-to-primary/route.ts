import type { NextRequest } from "next/server"

import { proxyWalletRequest } from "@/lib/server/walletProxy"

export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ userId: string; applicationId: string }> }

/**
 * POST /api/v1/wallets/user/{userId}/product-applications/{applicationId}/transfer-to-primary
 * Moves product-wallet funds to the user's PRIMARY wallet.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { userId, applicationId } = await params
  return proxyWalletRequest(request, [
    "user",
    userId,
    "product-applications",
    applicationId,
    "transfer-to-primary",
  ])
}
