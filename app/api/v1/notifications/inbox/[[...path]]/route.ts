import { NextRequest } from "next/server"

import { proxyNotificationsInboxRequest } from "@/lib/server/notificationsInboxProxy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ path?: string[] }> }

async function handle(request: NextRequest, { params }: RouteParams) {
  const { path } = await params
  return proxyNotificationsInboxRequest(request, path ?? [])
}

export async function GET(request: NextRequest, params: RouteParams) {
  return handle(request, params)
}

export async function PATCH(request: NextRequest, params: RouteParams) {
  return handle(request, params)
}

export async function DELETE(request: NextRequest, params: RouteParams) {
  return handle(request, params)
}
