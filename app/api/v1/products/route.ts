/**
 * Alias for GET/POST /api/products — upstream: NEXT_PUBLIC_API_URL + /api/v1/products/...
 * Handlers are wrapped here so `runtime` / `dynamic` live in this file (Next.js does not
 * apply them when re-exported from another module).
 */
import type { NextRequest } from "next/server"
import { GET as productsGET, POST as productsPOST } from "../../products/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET(request: NextRequest) {
  return productsGET(request)
}

export function POST(request: NextRequest) {
  return productsPOST(request)
}
