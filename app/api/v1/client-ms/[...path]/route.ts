import { NextRequest, NextResponse } from "next/server"

import { proxyClientAuthRequest } from "@/lib/server/clientAuthProxy"

export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ path: string[] }> }

function normalizeProxySegments(path: string[] | string | undefined): string[] {
  if (path == null) return []
  if (Array.isArray(path)) return path.map((s) => s.trim()).filter(Boolean)
  return String(path)
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
}

async function handle(request: NextRequest, { params }: RouteParams) {
  const { path } = await params
  return proxyClientAuthRequest(request, normalizeProxySegments(path))
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
