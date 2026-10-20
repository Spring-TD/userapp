import type { NextRequest } from "next/server"

import { proxyWalletRequest } from "@/lib/server/walletProxy"

export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ userId: string }> }

/** POST /api/v1/wallets/user/{userId}/transaction-pin */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { userId } = await params
  return proxyWalletRequest(request, ["user", userId, "transaction-pin"])
}

/** PUT /api/v1/wallets/user/{userId}/transaction-pin */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { userId } = await params
  return proxyWalletRequest(request, ["user", userId, "transaction-pin"])
}
