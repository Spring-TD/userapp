import { NextRequest } from "next/server"

import { Auth } from "@/app/api/auth/[...path]/route"

export const dynamic = "force-dynamic"

/** GET /api/v1/auth/email-exists?email=... — avoids path encoding issues with + and @ */
export async function GET(request: NextRequest) {
  const email =
    new URL(request.url).searchParams.get("email")?.trim() ||
    new URL(request.url).searchParams.get("identifier")?.trim() ||
    ""
  return Auth.emailExists(request, email)
}
