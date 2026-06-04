import { NextRequest } from "next/server"

import { proxyAccountMsApplicationsRequest } from "@/lib/server/accountMsApplicationsProxy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ path: string[] }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { path } = await params
  return proxyAccountMsApplicationsRequest(request, path)
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { path } = await params
  return proxyAccountMsApplicationsRequest(request, path)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { path } = await params
  return proxyAccountMsApplicationsRequest(request, path)
}
