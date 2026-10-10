import { NextResponse, type NextRequest } from "next/server"

import { isHeadCoach, staffForSchool } from "@/lib/college-programs/staff"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * One school's coaching staff, fetched when its card opens - 2,000 coaches would otherwise ride
 * along with every map load. Names and titles are public; the published emails are part of the
 * Recruiting Portal, so only Blue members, admins and verified coaches get them.
 */
export async function GET(request: NextRequest) {
  const schoolId = request.nextUrl.searchParams.get("school")?.trim()
  if (!schoolId) return NextResponse.json({ error: "school is required" }, { status: 400 })

  const { viewer } = await resolveRankingViewer({ supabase: await createClient(), admin: createAdminClient() })
  const full = Boolean(viewer.isBlueMember || viewer.isAdmin || viewer.isVerifiedCoach)

  const staff = staffForSchool(schoolId).map((member) => ({
    ...member,
    head: isHeadCoach(member),
    email: full ? member.email : null,
  }))
  return NextResponse.json({ staff, emails: full })
}
