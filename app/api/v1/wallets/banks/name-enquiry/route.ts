import type { NextRequest } from "next/server"

import { proxyWalletRequest } from "@/lib/server/walletProxy"

export const dynamic = "force-dynamic"

/** POST /api/v1/wallets/banks/name-enquiry */
export async function POST(request: NextRequest) {
  return proxyWalletRequest(request, ["banks", "name-enquiry"])
}
