import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  listNhscaDuals2026Registrations,
  NHSCA_DUALS_2026_EVENT_SLUGS,
  nhscaDualsRegistrationIsPaid,
} from "@/lib/nhsca-duals-2026-registrations"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const eventParam = request.nextUrl.searchParams.get("event")?.trim() || null

  try {
    const registrations = await listNhscaDuals2026Registrations(admin, {
      isAdmin: true,
      eventSlug: eventParam,
    })

    const paid = registrations.filter((r) => nhscaDualsRegistrationIsPaid(r))
    const pending = registrations.filter((r) => !nhscaDualsRegistrationIsPaid(r))
    const eventSlugs = eventParam ? [eventParam] : [...NHSCA_DUALS_2026_EVENT_SLUGS]

    return NextResponse.json({
      registrations,
      paidCount: paid.length,
      pendingCount: pending.length,
      eventSlugs,
    })
  } catch (error) {
    if ((error as { code?: string })?.code === "42P01") {
      return NextResponse.json(
        {
          error:
            "Table national_team_event_registrations does not exist. Run scripts/208-national-team-registrations-and-products.md (SQL block) in Supabase SQL Editor.",
        },
        { status: 503 }
      )
    }
    console.error("[admin/blue/national-team-registrations]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load registrations" },
      { status: 500 }
    )
  }
}
