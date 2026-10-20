import { NextRequest } from "next/server"

import { proxyAccountMsProductAccountsRequest } from "@/lib/server/accountMsProductAccountsProxy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ applicationId: string }> }

/** POST /api/v1/savings-accounts/:id/deposits */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { applicationId } = await params
  return proxyAccountMsProductAccountsRequest(
    request,
    ["savings-accounts", applicationId, "deposits"],
    "savings-deposits",
  )
}
