import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEventName } from "@/lib/national-team-events"

export const dynamic = "force-dynamic"

/** Event slugs for NHSCA hub (open link shows these only). */
const NHSCA_SLUGS = ["nhsca-duals-2026", "nhsca-duals-2026-select"]

/**
 * GET: Public hub data — no auth, no code.
 * Unpublished link: share with parents to view roster and update gear sizes. No security.
 * On any error we return 200 with empty events so the page always loads.
 */
export async function GET() {
  try {
    const admin = createAdminClient()
    const { data: rows, error } = await admin
      .from("national_team_event_registrations")
      .select("id, event_slug, athlete_first_name, athlete_last_name, athlete_email, parent_email, high_school, graduation_year, primary_weight, created_at, shirt_size, singlet_size, shorts_size, updated_at")
      .eq("status", "paid")
      .in("event_slug", NHSCA_SLUGS)
      .order("event_slug")
      .order("athlete_last_name")

    if (error) {
      console.error("[national-team/hub/open]", error)
      return NextResponse.json({ events: NHSCA_SLUGS.map((eventSlug) => ({ eventSlug, eventName: getEventName(eventSlug), roster: [] })) })
    }

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

    const bySlug = new Map<string, typeof roster>()
    for (const r of roster) {
      const slug = r.event_slug as string
      if (!bySlug.has(slug)) bySlug.set(slug, [])
      bySlug.get(slug)!.push(r)
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
    return NextResponse.json({
      events: NHSCA_SLUGS.map((eventSlug) => ({ eventSlug, eventName: getEventName(eventSlug), roster: [] })),
    })
  }
}
