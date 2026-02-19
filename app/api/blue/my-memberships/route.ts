import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/** GET: List Blue memberships where the current user is the payer (for profile / "My Blue"). */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: rows, error } = await admin
    .from("blue_memberships")
    .select("id, athlete_id, status, started_at, stripe_customer_id")
    .eq("payer_user_id", user.id)
    .order("started_at", { ascending: false })

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ memberships: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!rows?.length) {
    return NextResponse.json({ memberships: [] })
  }

  const athleteIds = [...new Set(rows.map((r) => r.athlete_id))]
  const { data: athletes } = await admin
    .from("athletes")
    .select("id, name, firstname, lastname, firstName, lastName")
    .in("id", athleteIds)

  const nameById: Record<string, string> = {}
  for (const a of athletes ?? []) {
    const row = a as Record<string, unknown>
    const id = String(row.id ?? "")
    const name =
      String(row.name ?? "").trim() ||
      [row.firstname ?? row.firstName, row.lastname ?? row.lastName].filter(Boolean).join(" ").trim()
    nameById[id] = name || "Athlete"
  }

  const memberships = rows.map((r) => ({
    id: r.id,
    athleteId: r.athlete_id,
    athleteName: nameById[r.athlete_id] ?? "—",
    status: r.status,
    startedAt: r.started_at,
    stripeCustomerId: r.stripe_customer_id ?? null,
  }))

  return NextResponse.json({ memberships })
}
