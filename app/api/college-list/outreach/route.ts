import { NextResponse, type NextRequest } from "next/server"

import { loadOutreachContext } from "@/lib/college-programs/outreach"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { hasPortalAccess } from "@/lib/ranking-visibility"

export const dynamic = "force-dynamic"

/**
 * The verified facts for an "Email the coach" draft: one of the account's own wrestlers, one
 * school. Blue members and admins only, like My List itself. The draft is assembled in the
 * browser and sent from the family's own email - nothing is sent from here.
 */
export async function GET(request: NextRequest) {
  const admin = createAdminClient()
  const { viewer, userId } = await resolveRankingViewer({ supabase: await createClient(), admin })
  if (!userId || !hasPortalAccess(viewer)) {
    return NextResponse.json({ error: "Emailing coaches is part of NC United Blue." }, { status: 403 })
  }

  const schoolId = request.nextUrl.searchParams.get("school")?.trim() ?? ""
  const athleteId = request.nextUrl.searchParams.get("athlete")?.trim() || null
  try {
    const context = await loadOutreachContext(admin, userId, schoolId, athleteId)
    if ("error" in context) return NextResponse.json({ error: context.error }, { status: context.status })
    return NextResponse.json(context)
  } catch (error) {
    console.error("[college-list/outreach]", error)
    return NextResponse.json({ error: "Could not load the draft. Try again." }, { status: 500 })
  }
}
