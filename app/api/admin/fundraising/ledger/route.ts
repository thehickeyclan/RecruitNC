import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(request: Request) {
  const adminCheck = await requireAdmin()
  if (adminCheck instanceof NextResponse) return adminCheck

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "350"), 1000)

  const supabase = await createClient()

  try {
    const { data: entries, error } = await supabase
      .from("fundraising_ledger")
      .select(`
        id,
        occurred_at,
        direction,
        entry_kind,
        amount_cents,
        summary,
        detail,
        athlete_code,
        stripe_checkout_session_id,
        athlete_expense_request_id,
        guild_credit_allocation_id,
        scholarship_donation_id,
        bucket_from,
        bucket_to
      `)
      .order("occurred_at", { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ entries: entries || [] })
  } catch (error) {
    console.error("Ledger error:", error)
    return NextResponse.json({ error: "Failed to fetch ledger" }, { status: 500 })
  }
}
