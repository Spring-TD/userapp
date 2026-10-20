import { NextRequest } from "next/server"

import { proxyAccountMsProductAccountsRequest } from "@/lib/server/accountMsProductAccountsProxy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ applicationId: string }> }

/** GET /api/v1/investment-accounts/:id/deposit-details */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { applicationId } = await params
  return proxyAccountMsProductAccountsRequest(
    request,
    ["investment-accounts", applicationId, "deposit-details"],
    "investment-deposit-details",
  )
}
