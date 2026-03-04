import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

const EVENT_SLUG = "nhsca-duals-2026"

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const eventSlug = request.nextUrl.searchParams.get("event") || EVENT_SLUG

  const { data: rows, error } = await admin
    .from("national_team_event_registrations")
    .select("*")
    .eq("event_slug", eventSlug)
    .order("created_at", { ascending: false })

  if (error) {
    if ((error as { code?: string })?.code === "42P01") {
      return NextResponse.json(
        { error: "Table national_team_event_registrations does not exist. Run scripts/208-national-team-registrations-and-products.md (SQL block) in Supabase SQL Editor." },
        { status: 503 }
      )
    }
    console.error("[admin/blue/national-team-registrations]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const paid = (rows ?? []).filter((r) => r.status === "paid" || r.order_id)
  const pending = (rows ?? []).filter((r) => r.status !== "paid" && !r.order_id)

  return NextResponse.json({
    registrations: rows ?? [],
    paidCount: paid.length,
    pendingCount: pending.length,
    eventSlug,
  })
}
