import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { HISTORICAL_WINS_MATCH_STATUSES } from "@/lib/historical-wins/constants"

export const dynamic = "force-dynamic"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await context.params
  const rowId = Number(id)
  if (!Number.isFinite(rowId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const action = String(body.action ?? "")
  const admin = createAdminClient()

  let match_status: string
  let athlete_id: string | null | undefined = undefined

  if (action === "approve") {
    match_status = "manually_confirmed"
    const proposed = body.athlete_id ? String(body.athlete_id) : null
    if (!proposed) {
      return NextResponse.json({ error: "athlete_id required to approve" }, { status: 400 })
    }
    athlete_id = proposed
  } else if (action === "reject") {
    match_status = "manually_rejected"
    athlete_id = null
  } else if (action === "unresolved") {
    match_status = "unmatched"
    athlete_id = null
  } else if (action === "needs_review") {
    match_status = "needs_review"
  } else {
    return NextResponse.json(
      { error: `action must be approve|reject|unresolved|needs_review` },
      { status: 400 },
    )
  }

  if (!HISTORICAL_WINS_MATCH_STATUSES.includes(match_status as (typeof HISTORICAL_WINS_MATCH_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const patch: Record<string, unknown> = {
    match_status,
    updated_at: new Date().toISOString(),
  }
  if (athlete_id !== undefined) patch.athlete_id = athlete_id

  const { data, error } = await admin
    .from("winningest_wrestlers")
    .update(patch)
    .eq("id", rowId)
    .select("id, match_status, athlete_id")
    .single()

  if (error) {
    console.error("[RecruitNC] historical-matches PATCH", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, row: data })
}
