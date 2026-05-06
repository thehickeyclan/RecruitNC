import { NextResponse } from "next/server"
import { buildFundraisingHubSnapshot } from "@/lib/fundraising/hub-data"

export const dynamic = "force-dynamic"

/**
 * Public JSON snapshot for the fundraising hub (combined Stripe hub sessions + optional active campaigns table).
 */
export async function GET() {
  try {
    const snapshot = await buildFundraisingHubSnapshot()
    const res = NextResponse.json(snapshot)
    res.headers.set("Cache-Control", "private, max-age=0, must-revalidate")
    return res
  } catch (e) {
    console.error("[api/fundraising/hub-data]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load fundraising hub data" },
      { status: 500 },
    )
  }
}
