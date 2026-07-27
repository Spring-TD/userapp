import { NextRequest } from "next/server"

import { proxyAccountMsProductAccountsRequest } from "@/lib/server/accountMsProductAccountsProxy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** POST /api/v1/savings-accounts — provision savings account via account-ms. */
export async function POST(request: NextRequest) {
  return proxyAccountMsProductAccountsRequest(request, ["savings-accounts"], "savings-accounts")
}
