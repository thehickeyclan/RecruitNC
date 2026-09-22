import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { resolveAthleteOwnership } from "@/lib/mobile/athlete-ownership"

/**
 * The editable values, for the person allowed to edit them.
 *
 * The public payload leaves GPA, test scores and the bio out on purpose — it is read by anyone
 * with an athlete id, and these are minors. But an athlete filling in their own form has to see
 * what is already there, or "edit" means "retype from memory and overwrite what you forgot".
 *
 * So the same fields come back here, behind the same ownership check the write uses, and the
 * response says plainly that it must not be cached by anything in between.
 */

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const athleteId = String(id ?? "").trim()
  if (!athleteId) return NextResponse.json({ ok: false, error: "Missing athlete id" }, { status: 400 })

  const admin = createAdminClient()
  const viewerId = await resolveRequestUserId(request)
  const ownership = await resolveAthleteOwnership(admin, athleteId, viewerId)
  if (!ownership.ok) {
    return NextResponse.json({ ok: false, error: ownership.error }, { status: ownership.status })
  }

  const { data, error } = await admin
    .from("athletes")
    .select(
      "academic_gpa, academic_sat, academic_act, academic_interest, college_weight_class, weightclass, highlight_video_url, bio, socialMedia",
    )
    .eq("id", athleteId)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Could not load that profile." }, { status: 500 })
  }

  const text = (v: unknown) => (v == null ? "" : String(v))

  return NextResponse.json(
    {
      ok: true,
      relationship: ownership.relationship,
      fields: {
        gpa: text(data.academic_gpa),
        sat: text(data.academic_sat),
        act: text(data.academic_act),
        intendedMajor: text(data.academic_interest),
        collegeWeightClass: text(data.college_weight_class),
        weightClass: text(data.weightclass),
        highlightVideoUrl: text(data.highlight_video_url),
        bio: text(data.bio),
        // Instagram lives in the socialMedia object; there is no column of its own.
        instagram: text((data.socialMedia as { instagram?: unknown } | null)?.instagram),
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  )
}
