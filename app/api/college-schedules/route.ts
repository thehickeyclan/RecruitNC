import { NextResponse, type NextRequest } from "next/server"
import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { currentSeason } from "@/lib/college-schedules/season"

export const dynamic = "force-dynamic"

/**
 * The teams a follower can pick, and one team's season.
 *
 * Public: a college schedule is public information and there is nothing private on this table.
 * Deliberately narrow all the same — a team must be named to get any meets back, because the
 * whole design is that nothing reaches the calendar until somebody chooses it, and an endpoint
 * that happily returns all twelve seasons at once would invite exactly the flooded month grid
 * this feature was shaped to avoid.
 */
const cachedTeams = unstable_cache(
  async () => {
    const admin = createAdminClient()
    // Only programs whose schedule we actually read; a college with no URL cannot be followed.
    const { data } = await admin
      .from("colleges")
      .select("id, name, division, logo_url")
      .not("wrestling_schedule_url", "is", null)
      .order("name")
    return data ?? []
  },
  ["college-schedule-teams", "v1"],
  { revalidate: 3600, tags: ["college-schedules"] },
)

const cachedSeason = unstable_cache(
  async (collegeId: string, season: string) => {
    const admin = createAdminClient()
    const { data } = await admin
      .from("college_schedules")
      .select(
        "id, college_id, season, event_date, start_time, event_type, opponent, event_name, home_away, location, stream_url, notes, status",
      )
      .eq("college_id", collegeId)
      .eq("season", season)
      .order("event_date", { ascending: true })
    return data ?? []
  },
  ["college-schedule-season", "v1"],
  { revalidate: 1800, tags: ["college-schedules"] },
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const collegeId = searchParams.get("college_id")
    const season = searchParams.get("season") || currentSeason()

    // No team named: hand back the picker, not the whole calendar.
    if (!collegeId) {
      return NextResponse.json({ season, teams: await cachedTeams() })
    }

    // A uuid or nothing — this string goes into a query.
    if (!/^[0-9a-f-]{36}$/i.test(collegeId)) {
      return NextResponse.json({ error: "A valid college id is required." }, { status: 400 })
    }

    const events = await cachedSeason(collegeId, season)
    return NextResponse.json({ season, collegeId, count: events.length, events })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load college schedules"
    console.error("[college-schedules] GET failed", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
