import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const admin = createAdminClient()
  const { data: rows, error } = await admin
    .from("guild_credit_allocations")
    .select(
      "id, user_id, athlete_id, amount_cents, status, guild_credit_ids, guild_balance_cents_after, error_message, campaign, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(500)

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return NextResponse.json({ allocations: [], note: "Table guild_credit_allocations not created yet." })
    }
    console.error("[admin/guild-credit-allocations]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ allocations: rows ?? [] })
}
