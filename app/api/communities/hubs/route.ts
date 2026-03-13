import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEventName, getEventSlugForApi, getHubGroupForEvent } from "@/lib/national-team-events"

export const dynamic = "force-dynamic"

export type HubListItem = {
  id: string
  slug: string
  name: string
  /** null = hub not linked from app (access via shared link only). */
  href: string | null
  type: "hub"
}

/**
 * GET /api/communities/hubs
 * Returns the list of event/program hubs the current user belongs to (for Community sidebar).
 * Lightweight: does not run full hub sync.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user?.id) {
    return NextResponse.json({ hubs: [] })
  }

  const admin = createAdminClient()
  const emailLower = (user.email ?? "").trim().toLowerCase()
  const toCanonical = (slug: string) => getEventSlugForApi(slug || "").trim() || slug
  const eventSlugs = new Set<string>()

  // From paid registrations (parent_email or parent_user_id match — same rules as hub-access)
  const { data: regsByUserId } = await admin
    .from("national_team_event_registrations")
    .select("event_slug")
    .eq("status", "paid")
    .eq("parent_user_id", user.id)
  for (const r of regsByUserId ?? []) {
    eventSlugs.add(toCanonical((r as { event_slug: string }).event_slug))
  }
  const { data: regsByEmail } = await admin
    .from("national_team_event_registrations")
    .select("event_slug")
    .eq("status", "paid")
    .ilike("parent_email", emailLower)
  for (const r of regsByEmail ?? []) {
    eventSlugs.add(toCanonical((r as { event_slug: string }).event_slug))
  }

  // From event_workspace_members (invite, add member, etc.)
  try {
    const { data: rows } = await admin
      .from("event_workspace_members")
      .select("event_slug")
      .eq("user_id", user.id)
    for (const row of rows ?? []) {
      eventSlugs.add(toCanonical((row as { event_slug: string }).event_slug))
    }
  } catch {
    // table may not exist
  }

  // Collapse slugs that belong to the same hub group (e.g. nhsca-duals-2026 + nhsca-duals-2026-select → one hub "NHSCA Duals 2026")
  const displaySlugSet = new Set<string>()
  for (const slug of eventSlugs) {
    const group = getHubGroupForEvent(slug)
    if (group) displaySlugSet.add(group.groupKey)
    else displaySlugSet.add(slug)
  }

  const hubs: HubListItem[] = [...displaySlugSet].sort().map((slug) => ({
    id: slug,
    slug,
    name: getEventName(slug),
    href: null as string | null,
    type: "hub" as const,
  }))

  return NextResponse.json({ hubs })
}
