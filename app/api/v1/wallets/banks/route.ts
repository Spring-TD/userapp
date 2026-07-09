import type { NextRequest } from "next/server"

import { proxyWalletRequest } from "@/lib/server/walletProxy"

export const dynamic = "force-dynamic"

/** GET /api/v1/wallets/banks */
export async function GET(request: NextRequest) {
  return proxyWalletRequest(request, ["banks"])
}
