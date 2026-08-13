import { NextResponse } from "next/server"
import { requireTocFieldViewer } from "@/lib/toc/require-toc-field-viewer"
import { createAdminClient } from "@/lib/supabase/admin"
import { getTocEventConfig } from "@/lib/toc/event-config"
import { buildTocFieldBoard } from "@/lib/toc/field-board"
import { applyTocAiSeedRecommendations, buildTocAiSeedRecommendations } from "@/lib/toc/ai-seeding"
import { applyPersonalSeedOrdersToFieldBoard, readTocPersonalSeedOrders } from "@/lib/toc/personal-seeding"
import { buildFieldClubBreakdown } from "@/lib/toc/field-club-breakdown"

export const dynamic = "force-dynamic"

/** Admin field board — all invitations grouped by weight (not public). */
export async function GET() {
  const auth = await requireTocFieldViewer()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const admin = createAdminClient()
  const [invitationsResult, config] = await Promise.all([
    admin
      .from("toc_invitations")
      .select("*, athletes(id, name, highschool, graduationyear, college, collegeLogoUrl, colleges(name, division, logo_url))")
      .order("weight_class")
      .order("confirmed_at", { ascending: true, nullsFirst: false })
      .order("invited_at", { ascending: true, nullsFirst: false }),
    getTocEventConfig(),
  ])

  const { data, error } = invitationsResult

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({
        board: buildTocFieldBoard([]),
        bracketsUrl: config.brackets_url,
        unavailable: true,
      })
    }
    console.error("[admin/toc/field]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const board = buildTocFieldBoard(data ?? [])
  const athleteIds = [...new Set(board.weights.flatMap((w) => w.athletes.map((a) => a.athleteId)).filter(Boolean))]
  const athleteRowsById = new Map<string, Record<string, unknown>>()

  if (athleteIds.length) {
    const { data: athleteRows, error: athleteError } = await admin.from("athletes").select("*").in("id", athleteIds)
    if (athleteError) {
      console.warn("[admin/toc/field] AI seeding athlete lookup failed", athleteError.message)
    } else {
      for (const row of athleteRows ?? []) athleteRowsById.set(String(row.id), row as Record<string, unknown>)
    }
  }

  const recommendations = await buildTocAiSeedRecommendations({
    supabase: admin,
    board,
    athleteRowsById,
  }).catch((e) => {
    console.warn("[admin/toc/field] AI seeding failed", e instanceof Error ? e.message : e)
    return new Map()
  })

  const recommendedBoard = applyTocAiSeedRecommendations(board, recommendations)
  const responseBoard = auth.isAdmin
    ? recommendedBoard
    : applyPersonalSeedOrdersToFieldBoard(recommendedBoard, readTocPersonalSeedOrders(auth.appMetadata))

  // Club mix of the confirmed field. athleteRowsById is already loaded for AI seeding, so
  // this costs no extra query — it just exposes what was fetched anyway.
  const confirmedAthleteIds = new Set(
    board.weights.flatMap((w) =>
      w.athletes.filter((a) => a.status === "confirmed").map((a) => String(a.athleteId)),
    ),
  )
  const clubBreakdown = buildFieldClubBreakdown(
    [...confirmedAthleteIds].map((id) => athleteRowsById.get(id) ?? {}),
  )

  return NextResponse.json({
    board: responseBoard,
    clubBreakdown,
    bracketsUrl: config.brackets_url,
    canManage: auth.isAdmin,
    workspace: auth.isAdmin ? "official" : "personal",
  })
}
