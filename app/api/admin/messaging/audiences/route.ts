import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEventSlugsForAdmin, getEventName } from "@/lib/national-team-events"

export const dynamic = "force-dynamic"

export type ProfileOption = { value: string; label: string }
export type AudienceGroupOption = {
  id: string
  type: "event" | "forum" | "blue" | "contacts"
  name: string
}
export type AudiencesResponse = {
  profiles: ProfileOption[]
  groups: AudienceGroupOption[]
}

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin)
    return {
      ok: false as const,
      status: 403 as const,
      error: "Admin required",
    }
  return { ok: true as const }
}

/** GET: List audience options — profiles (role) and groups (Blue, NHSCA events, forum groups). */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()

  const profiles: ProfileOption[] = []
  try {
    const { data: roleRows } = await admin.from("user_profiles").select("role").not("role", "is", null)
    const roles = [...new Set((roleRows ?? []).map((r: { role: string | null }) => (r.role ?? "").trim()).filter(Boolean))].sort()
    for (const r of roles) {
      const label = r.charAt(0).toUpperCase() + r.slice(1).toLowerCase()
      profiles.push({ value: r, label })
    }
  } catch {
    // table or column may not exist
  }
  if (profiles.length === 0) {
    profiles.push({ value: "all", label: "All profiles" })
  }

  const groups: AudienceGroupOption[] = []

  groups.push({
    id: "toc-college-coaches",
    type: "contacts",
    name: "TOC · College Coaches",
  })

  // Blue Program members
  try {
    const { data: blueRows } = await admin.from("blue_memberships").select("id").eq("status", "active").limit(1)
    if (blueRows && blueRows.length > 0) {
      groups.push({ id: "blue", type: "blue", name: "Blue Program members" })
    }
  } catch {
    // table may not exist
  }

  // Event hubs (NHSCA Duals 2026, etc.)
  for (const eventSlug of getEventSlugsForAdmin()) {
    groups.push({
      id: `event:${eventSlug}`,
      type: "event",
      name: getEventName(eventSlug),
    })
  }

  // Forum groups
  try {
    const { data: forumGroups } = await admin.from("forum_groups").select("id, name").order("name")
    for (const g of forumGroups ?? []) {
      const row = g as { id: string; name: string }
      groups.push({ id: `forum:${row.id}`, type: "forum", name: row.name })
    }
  } catch {
    // table may not exist
  }

  return NextResponse.json({ profiles, groups } as AudiencesResponse)
}
