import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const SEGMENTS = ["bio", "achievements", "academic", "highlightVideo", "photo", "contact"] as const

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
  photo_url?: string | null
  gpa?: number | null
  sat?: number | null
  act?: number | null
  cell?: string | null
  cell_number?: string | null
  phone?: string | null
  contact_email?: string | null
  contactEmail?: string | null
  email?: string | null
  socialMedia?: unknown
  social_media?: unknown
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
    (row.academic_gpa ?? row.gpa) != null ||
    (row.academic_sat ?? row.sat) != null ||
    (row.academic_act ?? row.act) != null ||
    (typeof row.academic_summary === "string" && row.academic_summary.trim().length > 0)
  const hasHighlightVideo =
    typeof row.highlight_video_url === "string" && row.highlight_video_url.trim().length > 0
  const rawPhoto = row.photourl ?? row.photo_url ?? null
  const hasPhoto =
    typeof rawPhoto === "string" &&
    rawPhoto.trim().length > 0 &&
    !/silhouette|placeholder|^\/?$/.test(rawPhoto.trim())

  // Contact: phone OR email OR instagram (from socialMedia JSON or legacy top-level)
  const rawPhone = row.cell ?? row.cell_number ?? row.phone ?? null
  const rawEmail = row.contact_email ?? row.contactEmail ?? row.email ?? null
  const rawSocial = row.socialMedia ?? row.social_media ?? null
  const instagramVal =
    rawSocial !== null &&
    typeof rawSocial === "object" &&
    !Array.isArray(rawSocial)
      ? (rawSocial as Record<string, unknown>).instagram
      : null
  const hasContact =
    (typeof rawPhone === "string" && rawPhone.trim().length > 0) ||
    (typeof rawEmail === "string" && rawEmail.trim().length > 0) ||
    (typeof instagramVal === "string" && instagramVal.trim().length > 0)

  const completed: Segment[] = []
  if (hasBio) completed.push("bio")
  if (hasAchievements) completed.push("achievements")
  if (hasAcademic) completed.push("academic")
  if (hasHighlightVideo) completed.push("highlightVideo")
  if (hasPhoto) completed.push("photo")
  if (hasContact) completed.push("contact")
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

  /*
   * Only this account's own wrestlers: the ones it claimed or is linked to as a parent. The ids
   * come from the query string, so without this any account could ask whether any wrestler has
   * a GPA or a phone on file. Admins may check anyone.
   */
  const admin = createAdminClient()
  const [{ data: me }, { data: claimed }, { data: linked }] = await Promise.all([
    admin.from("user_profiles").select("is_admin, role").eq("user_id", user.id).maybeSingle(),
    admin.from("athletes").select("id").eq("claimed_by_user_id", user.id).in("id", ids),
    admin.from("parent_athlete_links").select("athlete_id").eq("user_id", user.id).in("athlete_id", ids),
  ])
  const isAdmin = me?.is_admin === true || String(me?.role ?? "").toLowerCase() === "admin"
  const mine = new Set([...(claimed ?? []).map((r) => String(r.id)), ...(linked ?? []).map((r) => String(r.athlete_id))])
  const allowed = isAdmin ? ids : ids.filter((id) => mine.has(id))
  if (allowed.length === 0) return NextResponse.json({ athletes: [] })

  // Full row — avoids 42703 when prod schema differs (missing cell, photo_url, etc.). Server key,
  // because completeness reads the private fields the signed-in role cannot select.
  const { data: rows, error } = await admin.from("athletes").select("*").in("id", allowed)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const athletes = (rows ?? []).map((row) => {
    const { percent, completed, missing } = computeCompleteness(row)
    return { id: row.id, percent, completed, missing }
  })
  return NextResponse.json({ athletes })
}
