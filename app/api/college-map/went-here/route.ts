import { NextResponse, type NextRequest } from "next/server"

import { rosterForSchool } from "@/lib/college-programs/rosters"
import { loadWentHere } from "@/lib/college-programs/went-here"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * "NC wrestlers who went here" for a school's card. Part of the Recruiting Portal: Blue members,
 * admins and verified coaches. Everyone else gets `locked` and nothing else.
 */
export async function GET(request: NextRequest) {
  const schoolId = request.nextUrl.searchParams.get("school")?.trim() ?? ""
  const admin = createAdminClient()
  const { viewer, userId } = await resolveRankingViewer({ supabase: await createClient(), admin })
  if (!(viewer.isBlueMember || viewer.isAdmin || viewer.isVerifiedCoach)) return NextResponse.json({ locked: true })

  try {
    // A coach has no wrestler of his own to set beside it.
    const wentHere = await loadWentHere(admin, schoolId, viewer.isBlueMember || viewer.isAdmin ? userId : null)
    // The roster is a file and always there; the commitments wait on the snapshot's first build.
    return NextResponse.json({ locked: false, roster: rosterForSchool(schoolId), wentHere })
  } catch (error) {
    console.error("[college-map/went-here]", error)
    return NextResponse.json({ error: "Could not load who went here." }, { status: 500 })
  }
}
