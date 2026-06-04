import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { AAU_SCHOLASTIC_EVENT_SLUG } from "@/lib/aau-scholastic-duals-2026-content"
import { buildAauScholasticRosterPaymentMatrix } from "@/lib/aau-scholastic-roster-payment-matrix"
import { listNhscaDuals2026Registrations } from "@/lib/nhsca-duals-2026-registrations"

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()

  try {
    const registrations = await listNhscaDuals2026Registrations(admin, {
      isAdmin: true,
      eventSlug: AAU_SCHOLASTIC_EVENT_SLUG,
    })
    const matrix = buildAauScholasticRosterPaymentMatrix(registrations)
    return NextResponse.json({ ...matrix, event_slug: AAU_SCHOLASTIC_EVENT_SLUG })
  } catch (error) {
    if ((error as { code?: string })?.code === "42P01") {
      return NextResponse.json(
        {
          error:
            "Table national_team_event_registrations does not exist. Run scripts/208-national-team-registrations-and-products.md (SQL block) in Supabase SQL Editor.",
        },
        { status: 503 },
      )
    }
    console.error("[admin/blue/aau-duals-roster-payments]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load AAU roster payments" },
      { status: 500 },
    )
  }
}
