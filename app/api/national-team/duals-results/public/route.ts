import { NextResponse } from "next/server"
import { createAdminClientFresh } from "@/lib/supabase/admin"
import {
  bootstrapNhscaDualsEvent,
  ensureNhscaDualsDay1Schedule,
  ensureNhscaDualsDay2Schedule,
  ensureNhscaDualsDay3Schedule,
  fetchNhscaDualsSnapshot,
} from "@/lib/nhsca-duals-live-results/db"
import { buildNhscaDualsBigWins } from "@/lib/nhsca-duals-big-wins"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const NO_STORE = { "Cache-Control": "no-store, max-age=0" }

/** Public read-only NHSCA Duals 2026 results for the archive page (no sign-in). */
export async function GET() {
  const admin = createAdminClientFresh()
  let snap = await fetchNhscaDualsSnapshot(admin)

  async function ensureSchedules() {
    if (!snap.ok || snap.data.teams.length === 0) return
    await ensureNhscaDualsDay1Schedule(admin)
    await ensureNhscaDualsDay2Schedule(admin)
    await ensureNhscaDualsDay3Schedule(admin)
    snap = await fetchNhscaDualsSnapshot(admin)
  }

  async function publishRecordedDuals() {
    const { error } = await admin
      .from("nhsca_duals_duals")
      .update({ published: true, updated_at: new Date().toISOString() })
      .in("status", ["final", "in_progress"])
      .eq("published", false)
    if (error) {
      console.error("[RecruitNC] nhsca duals public publish backfill", error.message)
      return
    }
    snap = await fetchNhscaDualsSnapshot(admin)
  }

  try {
    if (!snap.ok) {
      await bootstrapNhscaDualsEvent(admin)
      snap = await fetchNhscaDualsSnapshot(admin)
    } else if (snap.data.teams.length === 0) {
      await bootstrapNhscaDualsEvent(admin)
      snap = await fetchNhscaDualsSnapshot(admin)
    }

    if (snap.ok && snap.data.teams.length > 0) {
      try {
        await ensureSchedules()
      } catch (e) {
        console.error("[RecruitNC] nhsca duals public schedule", e)
      }
      try {
        await publishRecordedDuals()
      } catch (e) {
        console.error("[RecruitNC] nhsca duals public publish", e)
      }
    }
  } catch (e) {
    console.error("[RecruitNC] nhsca duals public bootstrap", e)
  }

  if (!snap.ok) {
    return NextResponse.json(
      {
        tablesReady: false,
        teams: [],
        wrestlers: [],
        days: [],
        pools: [],
        duals: [],
        matches: [],
        summaries: {
          national: {
            dualWins: 0,
            dualLosses: 0,
            matchWins: 0,
            matchLosses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            undefeated: [],
            topScorers: [],
          },
          select: {
            dualWins: 0,
            dualLosses: 0,
            matchWins: 0,
            matchLosses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            undefeated: [],
            topScorers: [],
          },
        },
        bigWins: [],
        message: "Results tables are not set up yet.",
      },
      { status: 200, headers: NO_STORE }
    )
  }

  const hasResults =
    snap.data.teams.length > 0 || snap.data.duals.length > 0 || snap.data.matches.length > 0
  const bigWins = hasResults ? buildNhscaDualsBigWins(snap.data) : []

  return NextResponse.json(
    {
      tablesReady: hasResults,
      ...snap.data,
      bigWins,
      message: hasResults ? undefined : "No dual results in the database yet.",
    },
    { headers: NO_STORE }
  )
}
