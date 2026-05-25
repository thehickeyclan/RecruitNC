import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchNhscaDualsSnapshot } from "@/lib/nhsca-duals-live-results/db"
import { buildNhscaDualsBigWins } from "@/lib/nhsca-duals-big-wins"

export const dynamic = "force-dynamic"

/** Public read-only NHSCA Duals 2026 results for the archive page (no sign-in). */
export async function GET() {
  const admin = createAdminClient()
  const snap = await fetchNhscaDualsSnapshot(admin)

  if (!snap.ok) {
    return NextResponse.json(
      { tablesReady: false, message: "Results are not available yet." },
      { status: 503, headers: { "Cache-Control": "public, s-maxage=60" } }
    )
  }

  const tablesReady = snap.data.teams.length > 0
  const bigWins = tablesReady ? buildNhscaDualsBigWins(snap.data) : []

  return NextResponse.json(
    {
      tablesReady,
      ...snap.data,
      bigWins,
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } }
  )
}
