import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadCoachViewer } from "@/lib/coach-viewer"
import { programStaffIds, programStages } from "@/lib/recruiting/program-stage"
import { loadStaffActivity } from "@/lib/recruiting/staff-activity"

export const dynamic = "force-dynamic"

/**
 * One wrestler's record for the coach looking at his profile: whether the program has him on its
 * board, his stage, and everything the staff has done with him, newest first (Matt, 5 Nov 2026,
 * after the Teamworks/ARMS recruit screen). College coaches and admins only.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 })

  const admin = createAdminClient()
  const viewer = await loadCoachViewer(admin, user.id)
  if (!viewer.maySeePrivate) return NextResponse.json({ error: "College coaches only" }, { status: 403 })

  const staff = await programStaffIds(admin, user.id)
  const [{ data: stars }, timeline] = await Promise.all([
    admin.from("college_coach_stars").select("athlete_id, pipeline_stage, updated_at, starred_at").eq("athlete_id", id).in("coach_user_id", staff),
    loadStaffActivity(admin, user.id, 100, id).catch(() => []),
  ])
  const onBoard = Boolean(stars?.length)
  return NextResponse.json(
    { onBoard, stage: onBoard ? (programStages(stars ?? []).get(id) ?? "Prospect") : null, timeline },
    { headers: { "Cache-Control": "no-store" } },
  )
}
