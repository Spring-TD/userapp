import { NextRequest } from "next/server"

import { proxyAccountMsProductAccountsRequest } from "@/lib/server/accountMsProductAccountsProxy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** POST /api/v1/investment-accounts — provision investment account via account-ms. */
export async function POST(request: NextRequest) {
  return proxyAccountMsProductAccountsRequest(request, ["investment-accounts"], "investment-accounts")
}
