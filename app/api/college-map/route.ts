import { NextResponse } from "next/server"

import { loadCollegeMap } from "@/lib/college-programs/load"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * Every school is public. The filters and the On RecruitNC flag are the Recruiting Portal, which
 * is a Blue benefit (PRD, 9 Oct 2026); admins and verified coaches see them too.
 */
export async function GET() {
  const admin = createAdminClient()
  const { viewer } = await resolveRankingViewer({ supabase: await createClient(), admin })
  const full = Boolean(viewer.isBlueMember || viewer.isAdmin || viewer.isVerifiedCoach)

  try {
    return NextResponse.json(await loadCollegeMap(admin, full))
  } catch (error) {
    console.error("[college-map]", error)
    return NextResponse.json({ error: "Could not load the college map." }, { status: 500 })
  }
}
