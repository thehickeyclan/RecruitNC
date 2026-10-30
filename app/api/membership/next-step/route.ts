import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { canSeeProspectRanking, hasPortalAccess } from "@/lib/ranking-visibility"
import { familyNextStep, type FamilyNextStep } from "@/lib/recruiting/family-next-step"

export const dynamic = "force-dynamic"

/**
 * The one thing a family should do next, for the RecruitWrestlers header button (Matt, 29 Oct
 * 2026): claim the free profile, add GPA and a cell, take Insider, then the Command Center.
 * College coaches and staff get none.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const none = { step: null, athleteId: null } satisfies FamilyNextStep
  if (!user) return NextResponse.json(familyNextStep({ signedIn: false }), { headers: { "Cache-Control": "no-store" } })
  const admin = createAdminClient()
  const { viewer } = await resolveRankingViewer({ supabase, admin })
  if (viewer.isAdmin || viewer.isVerifiedCoach) return NextResponse.json(none, { headers: { "Cache-Control": "no-store" } })

  // His own profile first, then any claimed or linked as a parent.
  const [{ data: prof }, { data: claimed }, { data: links }] = await Promise.all([
    admin.from("user_profiles").select("athlete_id").eq("user_id", user.id).maybeSingle(),
    admin.from("athletes").select("id").eq("claimed_by_user_id", user.id).limit(5),
    admin.from("parent_athlete_links").select("athlete_id").eq("user_id", user.id).limit(5),
  ])
  const ids = [
    (prof as { athlete_id?: string | null } | null)?.athlete_id,
    ...(claimed ?? []).map((r) => (r as { id: string }).id),
    ...(links ?? []).map((r) => (r as { athlete_id: string }).athlete_id),
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0)
  const athleteId = ids[0] ?? null
  let hasGpa = false
  let hasCell = false
  if (athleteId) {
    const { data: a } = await admin.from("athletes").select("academic_gpa, phone").eq("id", athleteId).maybeSingle()
    const row = (a ?? {}) as { academic_gpa?: number | null; phone?: string | null }
    hasGpa = row.academic_gpa != null
    hasCell = Boolean((row.phone ?? "").trim())
  }
  return NextResponse.json(
    familyNextStep({ signedIn: true, athleteId, hasGpa, hasCell, insider: canSeeProspectRanking(viewer), commandCenter: hasPortalAccess(viewer) }),
    { headers: { "Cache-Control": "no-store" } },
  )
}
