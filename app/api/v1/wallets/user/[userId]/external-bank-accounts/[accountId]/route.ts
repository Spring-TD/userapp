import type { NextRequest } from "next/server"

import { proxyWalletRequest } from "@/lib/server/walletProxy"

export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ userId: string; accountId: string }> }

/** DELETE /api/v1/wallets/user/{userId}/external-bank-accounts/{accountId} */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { userId, accountId } = await params
  return proxyWalletRequest(request, ["user", userId, "external-bank-accounts", accountId])
}
