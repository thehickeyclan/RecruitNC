import { NextResponse, type NextRequest } from "next/server"

import { rosterForSchool } from "@/lib/college-programs/rosters"
import { loadWentHere } from "@/lib/college-programs/went-here"
import { familyFocus } from "@/lib/recruiting/family-focus"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { hasPortalAccess } from "@/lib/ranking-visibility"
import { STATE_NAMES } from "@/lib/college-programs/states"
import { readWentHereSnapshot, snapshotForState } from "@/lib/college-programs/went-here-snapshot"
import { familyState } from "@/lib/recruiting/family-state"
import { HOME_STATE } from "@/lib/recruiting/states"

export const dynamic = "force-dynamic"

/**
 * "NC wrestlers who went here" for a school's card. Part of the Recruiting Portal: Blue members,
 * admins and verified coaches. Everyone else gets `locked` and nothing else.
 */
export async function GET(request: NextRequest) {
  const schoolId = request.nextUrl.searchParams.get("school")?.trim() ?? ""
  const admin = createAdminClient()
  const { viewer, userId } = await resolvePortalViewer({ supabase: await createClient(), admin })
  if (!(hasPortalAccess(viewer) || viewer.isVerifiedCoach)) {
    // Locked: who went here is paid, but how many is the reason to subscribe (Matt, 17 Oct 2026).
    // Counted for the family's own state - South Carolina alumni for an SC family - and North
    // Carolina for everyone else. A commit with no state is from before SC, so it is NC's.
    const state = await familyState(admin, userId).catch(() => HOME_STATE)
    const snapshot = snapshotForState(await readWentHereSnapshot().catch(() => null), state)
    const count = (snapshot?.commits ?? []).filter((c) => c.schoolId === schoolId).length
    return NextResponse.json({ locked: true, alumni: { count, state, stateName: STATE_NAMES[state] ?? state } })
  }

  try {
    // A coach has no wrestler of his own to set beside it.
    const family = hasPortalAccess(viewer) ? userId : null
    const focus = family ? await familyFocus(admin, family) : null
    const wentHere = await loadWentHere(admin, schoolId, family, focus?.gender ?? null)
    // The roster is a file and always there; the commitments wait on the snapshot's first build.
    return NextResponse.json({ locked: false, roster: rosterForSchool(schoolId), wentHere })
  } catch (error) {
    console.error("[college-map/went-here]", error)
    return NextResponse.json({ error: "Could not load who went here." }, { status: 500 })
  }
}
