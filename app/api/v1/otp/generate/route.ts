import type { NextRequest } from "next/server"

import { Auth } from "@/app/api/auth/[...path]/route"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  return Auth.otpGenerate(request)
}
