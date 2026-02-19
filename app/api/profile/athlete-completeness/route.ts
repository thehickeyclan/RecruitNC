import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const SEGMENTS = ["bio", "achievements", "academic", "highlightVideo", "photo"] as const

type Segment = (typeof SEGMENTS)[number]

function computeCompleteness(row: {
  bio?: string | null
  bio_headline?: string | null
  achievements?: unknown
  additional_achievements?: string | null
  academic_gpa?: number | null
  academic_sat?: number | null
  academic_act?: number | null
  academic_summary?: string | null
  highlight_video_url?: string | null
  photourl?: string | null
}): { percent: number; completed: Segment[]; missing: Segment[] } {
  const hasBio =
    (typeof row.bio === "string" && row.bio.trim().length > 0) ||
    (typeof row.bio_headline === "string" && row.bio_headline.trim().length > 0)
  const hasAchievements =
    (Array.isArray(row.achievements) && row.achievements.length > 0) ||
    (typeof row.achievements === "string" && row.achievements.trim().length > 0) ||
    (typeof row.additional_achievements === "string" && row.additional_achievements.trim().length > 0)
  const hasAcademic =
    row.academic_gpa != null ||
    row.academic_sat != null ||
    row.academic_act != null ||
    (typeof row.academic_summary === "string" && row.academic_summary.trim().length > 0)
  const hasHighlightVideo =
    typeof row.highlight_video_url === "string" && row.highlight_video_url.trim().length > 0
  const hasPhoto =
    typeof row.photourl === "string" &&
    row.photourl.trim().length > 0 &&
    !/silhouette|placeholder|^\/?$/.test(row.photourl.trim())

  const completed: Segment[] = []
  if (hasBio) completed.push("bio")
  if (hasAchievements) completed.push("achievements")
  if (hasAcademic) completed.push("academic")
  if (hasHighlightVideo) completed.push("highlightVideo")
  if (hasPhoto) completed.push("photo")
  const missing = SEGMENTS.filter((s) => !completed.includes(s))
  const percent = Math.round((completed.length / SEGMENTS.length) * 100)
  return { percent, completed, missing }
}

/** GET: Profile completeness for athlete(s). Query: ids=id1,id2 (comma-separated). Auth required. */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const idsParam = searchParams.get("ids")
  if (!idsParam?.trim()) {
    return NextResponse.json({ athletes: [] })
  }
  const ids = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
  if (ids.length === 0) return NextResponse.json({ athletes: [] })

  const { data: rows, error } = await supabase
    .from("athletes")
    .select(
      "id, bio, bio_headline, achievements, additional_achievements, academic_gpa, academic_sat, academic_act, academic_summary, highlight_video_url, photourl"
    )
    .in("id", ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const athletes = (rows ?? []).map((row) => {
    const { percent, completed, missing } = computeCompleteness(row)
    return { id: row.id, percent, completed, missing }
  })
  return NextResponse.json({ athletes })
}
