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
}

export type HubResponse = {
  allowed: boolean
  reason?: "signed_out" | "no_access"
  events?: HubEvent[]
}

export async function GET(): Promise<NextResponse<HubResponse>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user?.email) {
    return NextResponse.json({ allowed: false, reason: "signed_out" })
  }

  const admin = createAdminClient()

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single()

  const isAdmin = !!profile?.is_admin

  const { data: allRegs, error: regError } = await admin
    .from("national_team_event_registrations")
    .select("id, event_slug, athlete_first_name, athlete_last_name, athlete_email, parent_email, high_school, graduation_year, primary_weight, status, created_at")
    .eq("status", "paid")

  if (regError) {
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
    eventSlugsToShow = [...new Set(paidRegs.map((r) => r.event_slug))]
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

  const events: HubEvent[] = eventSlugsToShow.map((eventSlug) => ({
    eventSlug,
    eventName: getEventName(eventSlug),
    roster: paidRegs.filter((r) => r.event_slug === eventSlug),
  }))

  return NextResponse.json({
    allowed: true,
    events,
  })
}
