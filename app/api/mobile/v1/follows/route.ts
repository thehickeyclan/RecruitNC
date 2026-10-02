import { NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { followAthlete, followedAthleteIds, isFollowing, unfollowAthlete } from "@/lib/athlete-follows"

export const dynamic = "force-dynamic"

/**
 * The wrestlers this account follows, and the button that changes that.
 *
 * Following is what makes a result digest possible: when an event's results land, the only people
 * worth notifying are the ones who asked about one of the wrestlers in it. GET returns the list
 * for the "Following" screen, POST and DELETE are the one button on the athlete page.
 */
export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in to follow wrestlers." }, { status: 401 })

  const admin = createAdminClient()

  /*
   * One athlete asked about: the state of the Follow button on their page.
   *
   * It lives here rather than on the athlete profile route because that route is edge-cached and
   * public - putting a per-viewer field in it would serve one account's follows to the next reader.
   */
  const asked = request.nextUrl.searchParams.get("athleteId")?.trim()
  if (asked) {
    return NextResponse.json(
      { following: await isFollowing(admin, userId, asked) },
      { headers: { "Cache-Control": "no-store" } },
    )
  }

  const ids = await followedAthleteIds(admin, userId)
  if (ids.length === 0) return NextResponse.json({ athletes: [] })

  const { data } = await admin
    .from("athletes")
    .select("id, name, graduationyear, highschool, weightclass, photourl, college")
    .in("id", ids)

  /* Follow order, not the order the rows came back in. */
  const byId = new Map((data ?? []).map((r) => [String(r.id), r]))
  const athletes = ids
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => ({
      id: String(r.id),
      name: String(r.name ?? "Athlete"),
      classYear: r.graduationyear == null ? null : Number(r.graduationyear),
      school: r.highschool ? String(r.highschool) : null,
      weight: r.weightclass ? String(r.weightclass) : null,
      photoUrl: r.photourl ? String(r.photourl) : null,
      college: r.college ? String(r.college) : null,
    }))

  return NextResponse.json({ athletes })
}

export async function POST(request: NextRequest) {
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in to follow wrestlers." }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { athleteId?: string } | null
  const athleteId = String(body?.athleteId ?? "").trim()
  if (!athleteId) return NextResponse.json({ error: "Which wrestler?" }, { status: 400 })

  const admin = createAdminClient()
  const { data: athlete } = await admin.from("athletes").select("id").eq("id", athleteId).maybeSingle()
  if (!athlete) return NextResponse.json({ error: "That wrestler no longer exists." }, { status: 404 })

  const result = await followAthlete(admin, userId, athleteId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ following: true })
}

export async function DELETE(request: NextRequest) {
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in to follow wrestlers." }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { athleteId?: string } | null
  const athleteId = String(body?.athleteId ?? "").trim()
  if (!athleteId) return NextResponse.json({ error: "Which wrestler?" }, { status: 400 })

  const admin = createAdminClient()
  const result = await unfollowAthlete(admin, userId, athleteId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ following: false })
}
