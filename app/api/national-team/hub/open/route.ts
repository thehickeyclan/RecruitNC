import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEventName, getEventSlugForApi, normalizeEventSlugForLookup } from "@/lib/national-team-events"

export const dynamic = "force-dynamic"

/** Canonical event slugs for NHSCA hub (open link shows these only). */
const NHSCA_SLUGS = ["nhsca-duals-2026", "nhsca-duals-2026-select"]
/** DB may store URL slug "nhsca-2026"; include it so those rows are returned and mapped to nhsca-duals-2026. */
const NHSCA_QUERY_SLUGS = ["nhsca-2026", "nhsca-duals-2026", "nhsca-duals-2026-select"]

/**
 * GET: Public hub data — no auth, no code.
 * Unpublished link: share with parents to view roster and update gear sizes. No security.
 */
export async function GET() {
  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    console.error("[national-team/hub/open] createAdminClient failed — check SUPABASE_SERVICE_ROLE_KEY in Vercel:", e)
    return NextResponse.json(
      { error: "Server config", events: NHSCA_SLUGS.map((s) => ({ eventSlug: s, eventName: getEventName(s), roster: [] })) },
      { status: 500 }
    )
  }

  const { data: rows, error } = await admin
    .from("national_team_event_registrations")
    .select("id, event_slug, athlete_first_name, athlete_last_name, athlete_email, parent_email, high_school, graduation_year, primary_weight, created_at, shirt_size, singlet_size, shorts_size, updated_at")
    .eq("status", "paid")
    .in("event_slug", NHSCA_QUERY_SLUGS)
    .order("event_slug")
    .order("athlete_last_name")

  if (error) {
    console.error("[national-team/hub/open] query error:", error)
    return NextResponse.json(
      { error: error.message, events: NHSCA_SLUGS.map((s) => ({ eventSlug: s, eventName: getEventName(s), roster: [] })) },
      { status: 500 }
    )
  }

  try {

    const roster = (rows ?? []).map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: row.id,
        event_slug: row.event_slug,
        athlete_first_name: row.athlete_first_name,
        athlete_last_name: row.athlete_last_name,
        athlete_email: row.athlete_email,
        parent_email: (row.parent_email as string) ?? "",
        high_school: (row.high_school as string) ?? "",
        graduation_year: (row.graduation_year as string) ?? "",
        primary_weight: (row.primary_weight as string) ?? "",
        status: "paid",
        created_at: (row.created_at as string) ?? "",
        shirt_size: row.shirt_size ?? null,
        singlet_size: row.singlet_size ?? null,
        shorts_size: row.shorts_size ?? null,
        updated_at: row.updated_at ?? null,
      }
    })

    const toCanonical = (slug: string) => getEventSlugForApi(normalizeEventSlugForLookup(slug || "")) || slug
    const bySlug = new Map<string, typeof roster>()
    for (const r of roster) {
      const canonical = toCanonical(r.event_slug as string)
      if (!NHSCA_SLUGS.includes(canonical)) continue
      if (!bySlug.has(canonical)) bySlug.set(canonical, [])
      bySlug.get(canonical)!.push({ ...r, event_slug: canonical })
    }

    const events = NHSCA_SLUGS.map((eventSlug) => {
      const eventRoster = bySlug.get(eventSlug) ?? []
      return {
        eventSlug,
        eventName: getEventName(eventSlug),
        roster: eventRoster,
        myRegistrations: eventRoster,
        threadId: null,
        forumGroupId: null,
        forumChannelId: null,
        forumMessageCount: 0,
      }
    })

    return NextResponse.json({ events })
  } catch (e) {
    console.error("[national-team/hub/open]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error", events: NHSCA_SLUGS.map((s) => ({ eventSlug: s, eventName: getEventName(s), roster: [] })) },
      { status: 500 }
    )
  }
}
