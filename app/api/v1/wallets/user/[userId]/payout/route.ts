import type { NextRequest } from "next/server"

import { proxyWalletRequest } from "@/lib/server/walletProxy"

export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ userId: string }> }

/** POST /api/v1/wallets/user/{userId}/payout */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { userId } = await params
  return proxyWalletRequest(request, ["user", userId, "payout"])
}
