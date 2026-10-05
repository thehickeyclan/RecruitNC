import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { syncSiNationalRankings } from "@/lib/rankings/si-national"

export const dynamic = "force-dynamic"
export const maxDuration = 120

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get("authorization")
  if (auth === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

/**
 * Twice daily: load Sports Illustrated's newest national boys rankings the day they publish.
 * See lib/rankings/si-national.ts for why this exists. `?force=1` re-imports the current edition.
 * A failure returns 500 so it shows in Vercel's cron log rather than passing silently.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const result = await syncSiNationalRankings(createAdminClient(), {
      force: request.nextUrl.searchParams.get("force") === "1",
    })
    console.info("[si-rankings]", JSON.stringify(result))
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[si-rankings] failed:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
