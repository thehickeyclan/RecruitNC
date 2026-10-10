import { NextResponse, type NextRequest } from "next/server"

import { isHeadCoach, staffForSchool } from "@/lib/college-programs/staff"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * One school's coaching staff, fetched when its card opens - 2,000 coaches would otherwise ride
 * along with every map load.
 *
 * The staff list is the Recruiting Portal (Matt, 10 Oct 2026): where the programs are is public,
 * who to contact is Blue. Anyone else gets `locked` and no names - not merely no emails - so the
 * collected list cannot be read out one school at a time.
 */
export async function GET(request: NextRequest) {
  const schoolId = request.nextUrl.searchParams.get("school")?.trim()
  if (!schoolId) return NextResponse.json({ error: "school is required" }, { status: 400 })

  const { viewer } = await resolveRankingViewer({ supabase: await createClient(), admin: createAdminClient() })
  const full = Boolean(viewer.isBlueMember || viewer.isAdmin || viewer.isVerifiedCoach)

  if (!full) return NextResponse.json({ staff: [], locked: true })

  const staff = staffForSchool(schoolId).map((member) => ({ ...member, head: isHeadCoach(member) }))
  return NextResponse.json({ staff, locked: false })
}
