import { NextResponse } from "next/server"
import { countsAsCoachView } from "@/lib/coach-view-rule"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/**
 * A verified college coach tapped a wrestler's Call, Text or Email (components/contact-tap-tracker.tsx).
 * Stored as a user_analytics event, `coach_contact_tap`, beside profile views. Anyone else's tap
 * is dropped: the signal is "a college reached for the phone", nothing broader.
 */
const CHANNELS = new Set(["call", "text", "email"])

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { athleteId?: unknown; channel?: unknown } | null
  const athleteId = typeof body?.athleteId === "string" && /^[0-9a-f-]{36}$/i.test(body.athleteId) ? body.athleteId : null
  const channel = typeof body?.channel === "string" && CHANNELS.has(body.channel) ? body.channel : null
  if (!athleteId || !channel) return NextResponse.json({ ok: false }, { status: 400 })

  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  if (!user) return NextResponse.json({ ok: true, recorded: false })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, profile_type, verified_coach, email, is_admin")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!countsAsCoachView(profile as never)) return NextResponse.json({ ok: true, recorded: false })

  const { error } = await admin.from("user_analytics").insert({
    user_id: user.id,
    event_type: "coach_contact_tap",
    page_url: request.headers.get("referer"),
    user_agent: request.headers.get("user-agent"),
    event_data: { athlete_id: athleteId, channel },
    created_at: new Date().toISOString(),
  })
  if (error) console.error("[contact-tap] not recorded:", error.message)
  return NextResponse.json({ ok: true, recorded: !error })
}
