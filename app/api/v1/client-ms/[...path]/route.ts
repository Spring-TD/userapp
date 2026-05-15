import { NextRequest, NextResponse } from "next/server"

import { proxyClientAuthRequest } from "@/lib/server/clientAuthProxy"

export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ path: string[] }> }

async function handle(request: NextRequest, params: RouteParams) {
  const { path } = await params
  return proxyClientAuthRequest(request, path || [])
}

export async function GET(request: NextRequest, ctx: RouteParams) {
  return handle(request, ctx)
}

export async function HEAD(request: NextRequest, ctx: RouteParams) {
  return handle(request, ctx)
}

export async function POST(request: NextRequest, ctx: RouteParams) {
  return handle(request, ctx)
}

export async function PUT(request: NextRequest, ctx: RouteParams) {
  return handle(request, ctx)
}

export async function PATCH(request: NextRequest, ctx: RouteParams) {
  return handle(request, ctx)
}

export async function DELETE(request: NextRequest, ctx: RouteParams) {
  return handle(request, ctx)
}
