import { NextResponse } from "next/server"

import { loadCollegeMap } from "@/lib/college-programs/load"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { familyFocus } from "@/lib/recruiting/family-focus"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * Every school is public. The filters and the On RecruitNC flag are the Recruiting Portal, which
 * is a Blue benefit (PRD, 9 Oct 2026); admins and verified coaches see them too.
 */
export async function GET() {
  const admin = createAdminClient()
  const { viewer, userId } = await resolvePortalViewer({ supabase: await createClient(), admin })
  const full = Boolean(viewer.isBlueMember || viewer.isAdmin || viewer.isVerifiedCoach)

  try {
    // The men's-or-women's filter is part of the portal, so only a viewer who has it gets a default for it.
    const [map, focus] = await Promise.all([loadCollegeMap(admin, full), full ? familyFocus(admin, userId) : null])
    return NextResponse.json({ ...map, focus })
  } catch (error) {
    console.error("[college-map]", error)
    return NextResponse.json({ error: "Could not load the college map." }, { status: 500 })
  }
}
