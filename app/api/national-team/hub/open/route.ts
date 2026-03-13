import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEventName, getEventSlugForApi, normalizeEventSlugForLookup } from "@/lib/national-team-events"

export const dynamic = "force-dynamic"

/** Canonical event slugs for NHSCA hub (open link shows these only). */
const NHSCA_SLUGS = ["nhsca-duals-2026", "nhsca-duals-2026-select"]

const FALLBACK_NAMES: Record<string, string> = {
  "nhsca-duals-2026": "NHSCA Duals 2026",
  "nhsca-duals-2026-select": "NHSCA Duals 2026 – Select",
}

function emptyEventsResponse() {
  return NextResponse.json({
    events: NHSCA_SLUGS.map((s) => ({
      eventSlug: s,
      eventName: FALLBACK_NAMES[s] ?? s,
      roster: [] as Record<string, unknown>[],
    })),
  })
}

/**
 * GET: Public hub data — no auth, no code.
 * Unpublished link: share with parents to view roster and update gear sizes. No security.
 * Never returns 500 — always 200 with events (empty on failure) so the hub page can render.
 */
export async function GET() {
  try {
    const admin = createAdminClient()

    const { data: paidRows, error: paidError } = await admin
      .from("national_team_event_registrations")
      .select("id, event_slug, athlete_first_name, athlete_last_name, athlete_email, parent_email, high_school, graduation_year, primary_weight, created_at, shirt_size, singlet_size, shorts_size, updated_at")
      .ilike("status", "paid")
      .order("event_slug")
      .order("athlete_last_name")

    if (paidError) {
      console.error("[national-team/hub/open] paid regs query error:", paidError)
    }

    const rows = paidRows ?? []
    const roster = rows.map((r) => {
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
    const bySlug = new Map<string, (typeof roster)[number][]>()
    for (const r of roster) {
      const canonical = toCanonical(r.event_slug as string)
      if (!NHSCA_SLUGS.includes(canonical)) continue
      if (!bySlug.has(canonical)) bySlug.set(canonical, [])
      bySlug.get(canonical)!.push({ ...r, event_slug: canonical })
    }

    // Same as main hub: add interest-form lineup (Team 1 = National, Team 2 = Select). Merge: paid first, then lineup rows not already matched by name+weight.
    const nhscaNationalSlug = "nhsca-duals-2026"
    const nhscaSelectSlug = "nhsca-duals-2026-select"
    try {
      const { data: interestRows } = await admin
        .from("national_team_interest_forms")
        .select("id, first_name, last_name, high_school, graduation_year, primary_weight, nhsca_duals_team, nhsca_duals_starter, singlet_size, shorts_size, shirt_size, updated_at")
        .not("nhsca_duals_team", "is", null)
        .in("nhsca_duals_team", ["team_1", "team_2"])
      for (const row of interestRows ?? []) {
        const r = row as {
          id: string
          first_name: string
          last_name: string
          high_school: string | null
          graduation_year: string | null
          primary_weight: string | null
          nhsca_duals_team: string | null
          nhsca_duals_starter?: boolean
          singlet_size?: string | null
          shorts_size?: string | null
          shirt_size?: string | null
          updated_at?: string | null
        }
        const eventSlug = r.nhsca_duals_team === "team_2" ? nhscaSelectSlug : nhscaNationalSlug
        const paidList = bySlug.get(eventSlug) ?? []
        const key = `${(r.first_name ?? "").trim().toLowerCase()}-${(r.last_name ?? "").trim().toLowerCase()}-${r.primary_weight ?? ""}`
        const paidKeys = new Set(paidList.map((p) => `${(p.athlete_first_name ?? "").toString().trim().toLowerCase()}-${(p.athlete_last_name ?? "").toString().trim().toLowerCase()}-${p.primary_weight ?? ""}`))
        if (paidKeys.has(key)) continue
        paidList.push({
          id: `interest-${r.id}`,
          event_slug: eventSlug,
          athlete_first_name: r.first_name,
          athlete_last_name: r.last_name,
          athlete_email: null,
          parent_email: "",
          high_school: (r.high_school as string) ?? "",
          graduation_year: (r.graduation_year as string) ?? "",
          primary_weight: (r.primary_weight as string) ?? "",
          status: "lineup",
          created_at: "",
          shirt_size: r.shirt_size ?? null,
          singlet_size: r.singlet_size ?? null,
          shorts_size: r.shorts_size ?? null,
          updated_at: r.updated_at ?? null,
        } as (typeof roster)[number])
        bySlug.set(eventSlug, paidList)
      }
    } catch {
      // Table may not exist or RLS; continue with paid-only roster
    }

    // Sort merged roster by weight then last name (same as main hub).
    for (const slug of NHSCA_SLUGS) {
      const list = bySlug.get(slug) ?? []
      list.sort((a, b) => {
        const wA = parseInt((a as { primary_weight?: string }).primary_weight ?? "", 10) || 0
        const wB = parseInt((b as { primary_weight?: string }).primary_weight ?? "", 10) || 0
        if (wA !== wB) return wA - wB
        return ((a as { athlete_last_name?: string }).athlete_last_name ?? "").localeCompare((b as { athlete_last_name?: string }).athlete_last_name ?? "")
      })
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
    return emptyEventsResponse()
  }
}
