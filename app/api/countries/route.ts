import https from "node:https"

import axios from "axios"
import { NextResponse } from "next/server"

import type { CountryOption } from "@/lib/countryApi"
import { COUNTRIES_FALLBACK } from "@/lib/countriesFallback"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ISO_COUNTRIES_URL =
  "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json"

const httpsAgent = new https.Agent({ family: 4, keepAlive: true })

let cached: CountryOption[] | null = null

type IsoCountryRow = {
  name?: string
  "alpha-2"?: string
}

function mapIsoRows(rows: IsoCountryRow[]): CountryOption[] {
  return rows
    .map((row) => ({
      code: (row["alpha-2"] || "").trim().toLowerCase(),
      name: (row.name || row["alpha-2"] || "").trim(),
      dialCode: "",
    }))
    .filter((c) => c.code && c.name)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function GET() {
  if (cached?.length) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    })
  }

  try {
    const res = await axios.get<IsoCountryRow[]>(ISO_COUNTRIES_URL, {
      httpsAgent,
      timeout: 20_000,
      validateStatus: (status) => status >= 200 && status < 300,
    })
    const mapped = mapIsoRows(Array.isArray(res.data) ? res.data : [])
    if (mapped.length === 0) throw new Error("Empty country list")
    cached = mapped
    return NextResponse.json(mapped, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    })
  } catch (error) {
    console.error("[countries] upstream failed, using fallback", error)
    cached = COUNTRIES_FALLBACK
    return NextResponse.json(COUNTRIES_FALLBACK, {
      headers: { "Cache-Control": "public, s-maxage=3600" },
    })
  }
}
