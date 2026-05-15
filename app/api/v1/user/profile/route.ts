import { NextRequest } from "next/server"

import { proxyClientAuthRequest } from "@/lib/server/clientAuthProxy"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/user/profile
 * PUT /api/v1/user/profile
 *
 * Proxies to client-auth-ms `GET|PUT /api/v1/user/profile` via the shared IPv4 axios proxy.
 */
export async function GET(request: NextRequest) {
  return proxyClientAuthRequest(request, ["user", "profile"])
}

export async function PUT(request: NextRequest) {
  return proxyClientAuthRequest(request, ["user", "profile"])
}
