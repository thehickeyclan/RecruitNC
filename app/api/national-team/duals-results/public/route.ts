import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  bootstrapNhscaDualsEvent,
  ensureNhscaDualsDay1Schedule,
  ensureNhscaDualsDay2Schedule,
  ensureNhscaDualsDay3Schedule,
  fetchNhscaDualsSnapshot,
} from "@/lib/nhsca-duals-live-results/db"
import { buildNhscaDualsBigWins } from "@/lib/nhsca-duals-big-wins"

export const dynamic = "force-dynamic"

/** Public read-only NHSCA Duals 2026 results for the archive page (no sign-in). */
export async function GET() {
  const admin = createAdminClient()
  let snap = await fetchNhscaDualsSnapshot(admin)

  async function ensureSchedules() {
    if (!snap.ok || snap.data.teams.length === 0) return
    await ensureNhscaDualsDay1Schedule(admin)
    await ensureNhscaDualsDay2Schedule(admin)
    await ensureNhscaDualsDay3Schedule(admin)
    snap = await fetchNhscaDualsSnapshot(admin)
  }

  try {
    if (snap.ok && snap.data.teams.length > 0) {
      await ensureSchedules()
      // Backfill publish flag for completed duals (archive page reads finals even when unpublished).
      await admin
        .from("nhsca_duals_duals")
        .update({ published: true, updated_at: new Date().toISOString() })
        .eq("status", "final")
        .eq("published", false)
      snap = await fetchNhscaDualsSnapshot(admin)
    } else {
      await bootstrapNhscaDualsEvent(admin)
      snap = await fetchNhscaDualsSnapshot(admin)
      if (snap.ok && snap.data.teams.length > 0) {
        await ensureSchedules()
      }
    }
  } catch (e) {
    console.error("[RecruitNC] nhsca duals public bootstrap", e)
  }

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
