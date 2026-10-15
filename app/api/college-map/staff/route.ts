import { NextResponse, type NextRequest } from "next/server"

import { questionnairesForSchool } from "@/lib/college-programs/questionnaires"
import { isHeadCoach, staffForSchool } from "@/lib/college-programs/staff"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { hasPortalAccess } from "@/lib/ranking-visibility"

export const dynamic = "force-dynamic"

/**
 * One school's coaching staff, fetched when its card opens - 2,000 coaches would otherwise ride
 * along with every map load.
 *
 * The staff list and the recruiting questionnaire links are the Recruiting Portal (Matt, 10 Oct 2026): where the programs are is public,
 * who to contact is Blue. Anyone else gets `locked` and no names - not merely no emails - so the
 * collected list cannot be read out one school at a time.
 */
export async function GET(request: NextRequest) {
  const schoolId = request.nextUrl.searchParams.get("school")?.trim()
  if (!schoolId) return NextResponse.json({ error: "school is required" }, { status: 400 })

  const { viewer } = await resolvePortalViewer({ supabase: await createClient(), admin: createAdminClient() })
  const full = Boolean(hasPortalAccess(viewer) || viewer.isVerifiedCoach)

  if (!full) return NextResponse.json({ staff: [], questionnaires: [], locked: true })

  const staff = staffForSchool(schoolId).map((member) => ({ ...member, head: isHeadCoach(member) }))
  return NextResponse.json({ staff, questionnaires: questionnairesForSchool(schoolId), locked: false })
}
