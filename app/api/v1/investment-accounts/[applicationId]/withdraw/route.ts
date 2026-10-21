import { NextRequest } from "next/server"

import { proxyAccountMsProductAccountsRequest } from "@/lib/server/accountMsProductAccountsProxy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ applicationId: string }> }

/** POST /api/v1/investment-accounts/:id/withdraw */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { applicationId } = await params
  return proxyAccountMsProductAccountsRequest(
    request,
    ["investment-accounts", applicationId, "withdraw"],
    "investment-withdraw",
  )
}
