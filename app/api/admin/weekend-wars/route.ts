import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { WEEKEND_WARS_EVENT_SLUG } from "@/lib/weekend-wars"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("nc_united_practice_rsvps")
    .select("*")
    .eq("event_slug", WEEKEND_WARS_EVENT_SLUG)
    .order("created_at", { ascending: false })
    .limit(500)

  if (error) {
    console.error("[admin/weekend-wars]", error)
    const message =
      error.code === "42P01"
        ? "The RSVP database table has not been created yet. Run the pending migration from the admin dashboard."
        : error.message
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ rsvps: data ?? [] })
}
