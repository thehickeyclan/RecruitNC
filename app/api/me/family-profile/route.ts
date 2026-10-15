import { NextResponse } from "next/server"

import { familyAthleteIds } from "@/lib/coach-messages"
import { mostRecentGraduatedClassYear } from "@/lib/class-years"
import { getCoachViewsForAthlete } from "@/lib/coach-profile-views"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { classifyViewer } from "@/lib/viewer-role"

export const dynamic = "force-dynamic"

export type FamilyProfileWrestler = { id: string; name: string; firstName: string; photo: string | null; programs: number }
export type FamilyProfileResponse =
  | { kind: "signed-out" }
  | { kind: "staff" }
  | { kind: "family"; wrestlers: FamilyProfileWrestler[] }

/**
 * GET: the wrestlers this account is family for, with how many college programs viewed each, for
 * the "your profile" band on the community site (components/family-profile-band.tsx).
 *
 * Counts only - which programs viewed a wrestler is the paid part and stays on the profile.
 * Coaches and admins get "staff": the band is for families.
 */
export async function GET() {
  const json = (body: FamilyProfileResponse) => NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } })
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user?.id) return json({ kind: "signed-out" })

  const admin = createAdminClient()
  // The signed-in account - or, on a developer's machine, the family an admin is previewing (/dev/family-preview).
  const portal = await resolvePortalViewer({ supabase, admin })
  const userId = portal.userId ?? data.user.id
  const { data: profile } = await admin.from("user_profiles").select("role, profile_type, verified_coach, is_admin").eq("user_id", userId).maybeSingle()
  const who = classifyViewer(profile ?? null)
  if (profile?.is_admin === true || who.kind === "admin" || who.isCoach) return json({ kind: "staff" })

  const ids = await familyAthleteIds(admin, userId).catch(() => [] as string[])
  if (!ids.length) return json({ kind: "family", wrestlers: [] })
  const { data: rows } = await admin.from("athletes").select("id, name, firstName, photourl, graduationyear").in("id", ids).order("graduationyear", { ascending: true })
  // Graduates keep their profile but are not who the band is for; if every wrestler has graduated, show them anyway.
  const graduated = mostRecentGraduatedClassYear()
  const inSchool = (rows ?? []).filter((a) => !a.graduationyear || Number(a.graduationyear) > graduated)
  const shown = inSchool.length ? inSchool : (rows ?? [])
  const wrestlers = await Promise.all(
    shown.map(async (a) => {
      const name = String(a.name ?? "").trim()
      const views = await getCoachViewsForAthlete(admin, String(a.id)).catch(() => null)
      return {
        id: String(a.id),
        name,
        firstName: String(a.firstName ?? "").trim() || name.split(" ")[0] || "Your wrestler",
        photo: a.photourl ? String(a.photourl) : null,
        programs: views?.schools.length ?? 0,
      }
    }),
  )
  return json({ kind: "family", wrestlers })
}
