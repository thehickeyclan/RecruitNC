import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { AAU_SCHOLASTIC_EVENT_SLUG } from "@/lib/aau-scholastic-duals-2026-content"
import {
  applyAauTravelCommitmentsToMatrix,
  buildAauScholasticRosterPaymentMatrix,
} from "@/lib/aau-scholastic-roster-payment-matrix"
import { listNhscaDuals2026Registrations } from "@/lib/nhsca-duals-2026-registrations"
import {
  loadAauTravelCommitmentsByWeight,
  parseAauTravelNeed,
  upsertAauTravelCommitment,
} from "@/lib/aau-duals-travel-commitment"

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const, user }
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
    const commitments = await loadAauTravelCommitmentsByWeight(admin, AAU_SCHOLASTIC_EVENT_SLUG)
    const withTravel = applyAauTravelCommitmentsToMatrix(matrix, commitments)
    return NextResponse.json({ ...withTravel, event_slug: AAU_SCHOLASTIC_EVENT_SLUG })
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

/** PATCH: Save verbal travel need (flight / hotel / both) for a roster weight slot. */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: { weight_label?: string; travel_need?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const weightLabel = body.weight_label?.trim()
  if (!weightLabel) return NextResponse.json({ error: "weight_label required" }, { status: 400 })

  const travelNeed = parseAauTravelNeed(body.travel_need)
  const admin = createAdminClient()
  const result = await upsertAauTravelCommitment(admin, {
    eventSlug: AAU_SCHOLASTIC_EVENT_SLUG,
    weightLabel,
    travelNeed,
    userId: auth.user.id,
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, needsMigration: result.needsMigration === true },
      { status: result.needsMigration ? 503 : 500 },
    )
  }

  return NextResponse.json({ ok: true, weight_label: weightLabel, travel_need: travelNeed })
}
