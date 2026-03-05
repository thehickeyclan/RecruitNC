import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEventName } from "@/lib/national-team-events"

export type HubRegistration = {
  id: string
  event_slug: string
  athlete_first_name: string
  athlete_last_name: string
  athlete_email: string
  parent_email: string
  high_school: string
  graduation_year: string
  primary_weight: string
  status: string
  created_at: string
}

export type HubEvent = {
  eventSlug: string
  eventName: string
  roster: HubRegistration[]
  /** Registrations for the current user (parent_email match) — their form data. */
  myRegistrations: HubRegistration[]
  /** Messaging thread ID for this event (context_type=event, context_id=eventSlug), if one exists. */
  threadId: string | null
}

export type HubResponse = {
  allowed: boolean
  reason?: "signed_out" | "no_access"
  events?: HubEvent[]
  /** True when current user is admin (so UI can show reg link / invite code info). */
  isAdmin?: boolean
}

export async function GET(): Promise<NextResponse<HubResponse>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user?.email) {
    return NextResponse.json({ allowed: false, reason: "signed_out" })
  }

  const admin = createAdminClient()

  // Use admin client so RLS never hides the profile; reliable admin check.
  let profile = (await admin
    .from("user_profiles")
    .select("is_admin, role")
    .eq("user_id", user.id)
    .maybeSingle()).data as { is_admin?: boolean; role?: string } | null

  // Fallback: look up by email in case profile is keyed differently
  if (!profile && user.email) {
    profile = (await admin
      .from("user_profiles")
      .select("is_admin, role")
      .ilike("email", user.email)
      .maybeSingle()).data as { is_admin?: boolean; role?: string } | null
  }

  const isAdmin = !!profile?.is_admin || profile?.role === "admin"

  const { data: allRegs, error: regError } = await admin
    .from("national_team_event_registrations")
    .select("id, event_slug, athlete_first_name, athlete_last_name, athlete_email, parent_email, high_school, graduation_year, primary_weight, status, created_at")
    .eq("status", "paid")

  if (regError) {
    if (isAdmin) {
      console.warn("[national-team/hub] Admin access: registrations query failed", regError)
      return NextResponse.json({ allowed: true, events: [], isAdmin: true })
    }
    if ((regError as { code?: string })?.code === "42P01") {
      return NextResponse.json(
        { allowed: false, reason: "no_access" },
        { status: 200 }
      )
    }
    console.error("[national-team/hub]", regError)
    return NextResponse.json({ allowed: false, reason: "no_access" }, { status: 200 })
  }

  const paidRegs = (allRegs ?? []) as HubRegistration[]

  let eventSlugsToShow: string[]
  if (isAdmin) {
    const fromRegs = [...new Set(paidRegs.map((r) => r.event_slug))]
    eventSlugsToShow = fromRegs.length > 0 ? fromRegs : ["nhsca-duals-2026"]
  } else {
    const emailLower = user.email.toLowerCase()
    const myEventSlugs = new Set(
      paidRegs
        .filter((r) => (r.parent_email ?? "").toLowerCase() === emailLower)
        .map((r) => r.event_slug)
    )
    if (myEventSlugs.size === 0) {
      return NextResponse.json({ allowed: false, reason: "no_access" })
    }
    eventSlugsToShow = [...myEventSlugs]
  }

  const emailLower = user.email!.toLowerCase()

  const { data: eventThreads } = await admin
    .from("messaging_threads")
    .select("id, context_id")
    .eq("context_type", "event")
    .in("context_id", eventSlugsToShow)
  const threadIdByEvent = new Map<string, string>()
  for (const row of eventThreads ?? []) {
    const r = row as { id: string; context_id: string | null }
    if (r.context_id) threadIdByEvent.set(r.context_id, r.id)
  }

  // If admin and an event has no group chat thread yet, create it so the forum appears.
  if (isAdmin) {
    const userClient = await createClient()
    for (const eventSlug of eventSlugsToShow) {
      if (threadIdByEvent.has(eventSlug)) continue
      const eventName = getEventName(eventSlug)
      const now = new Date().toISOString()
      const { data: newThread, error: createErr } = await admin
        .from("messaging_threads")
        .insert({
          type: "group",
          name: `${eventName} chat`,
          context_type: "event",
          context_id: eventSlug,
          created_by_user_id: user.id,
          created_at: now,
          last_message_at: now,
        })
        .select("id")
        .single()
      if (createErr || !newThread) {
        console.warn("[national-team/hub] Could not create event thread", eventSlug, createErr)
        continue
      }
      threadIdByEvent.set(eventSlug, newThread.id)
      const memberRow = {
        thread_id: newThread.id,
        user_id: user.id,
        role: "admin" as const,
        notification_level: "all" as const,
        joined_at: now,
      }
      const { error: memberErr } = await userClient.from("messaging_thread_members").insert(memberRow)
      if (memberErr) {
        const { error: adminMemberErr } = await admin.from("messaging_thread_members").insert(memberRow)
        if (adminMemberErr) console.warn("[national-team/hub] Could not add admin to event thread", eventSlug, adminMemberErr)
      }
    }
  }

  const events: HubEvent[] = eventSlugsToShow.map((eventSlug) => {
    const roster = paidRegs.filter((r) => r.event_slug === eventSlug)
    const myRegistrations = roster.filter((r) => (r.parent_email ?? "").toLowerCase() === emailLower)
    return {
      eventSlug,
      eventName: getEventName(eventSlug),
      roster,
      myRegistrations,
      threadId: threadIdByEvent.get(eventSlug) ?? null,
    }
  })

  return NextResponse.json({
    allowed: true,
    events,
    isAdmin,
  })
}
