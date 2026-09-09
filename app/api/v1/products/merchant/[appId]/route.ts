import type { NextRequest } from "next/server"

import { GET as appCatalogGET } from "../../app/[appId]/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/v1/products/merchant/:appId — storefront alias of GET /api/v1/products/app/:appId.
 */
export function GET(request: NextRequest, context: { params: Promise<{ appId: string }> }) {
  return appCatalogGET(request, context)
}
