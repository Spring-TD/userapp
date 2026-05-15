import type { NextRequest } from "next/server"

import { Auth } from "@/app/api/auth/[...path]/route"

export const dynamic = "force-dynamic"

/** POST /api/v1/registration/user — same upstream path as `/api/auth/register`, no browser Origin. */
export async function POST(request: NextRequest) {
  return Auth.register(request)
}
